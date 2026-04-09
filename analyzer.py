"""
FFXIV Marketboard Analyst — Core Analysis Engine
Fetches crafting recipes from XIVAPI and live market prices from Universalis.
"""

import asyncio
import json
import os
import shutil
import time
from pathlib import Path
from typing import Optional

import httpx

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# On Vercel (and other serverless platforms) the repo root is read-only;
# only /tmp is writable.  We use /tmp/cache at runtime and seed it once
# from the bundled cache/ folder so cold starts have data immediately.
_BUNDLE_CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR = Path("/tmp/cache") if os.environ.get("VERCEL") else _BUNDLE_CACHE_DIR


def _seed_tmp_cache() -> None:
    """Copy bundled cache files into /tmp/cache if they are not already there."""
    if CACHE_DIR == _BUNDLE_CACHE_DIR:
        return  # running locally — nothing to seed
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    for src in _BUNDLE_CACHE_DIR.glob("*.json"):
        dst = CACHE_DIR / src.name
        if not dst.exists():
            shutil.copy2(src, dst)


_seed_tmp_cache()
RECIPE_CACHE_TTL = 86400  # 24 hours
RECIPE_CACHE_KEY = "recipes_v5"  # v5 = actually fetch ingredient PriceMid (NPC shop price)
GATHERING_CACHE_KEY = "gathering_v1"

XIVAPI_BASE = "https://xivapi.com"
XIVAPI_V2_BASE = "https://beta.xivapi.com/api/1"
UNIVERSALIS_BASE = "https://universalis.app/api/v2"

# Items where the 7-day avg sold price diverges more than this multiple from the
# current listing floor are skipped as suspicious (price manipulation / stale data).
MAX_PRICE_DIVERGENCE_RATIO = 5.0

JOBS: dict[str, int] = {
    "CRP": 8,
    "BSM": 9,
    "ARM": 10,
    "GSM": 11,
    "LTW": 12,
    "WVR": 13,
    "ALC": 14,
    "CUL": 15,
}

# XIVAPI v2 CraftType.Name -> job abbreviation
CRAFT_TYPE_TO_JOB: dict[str, str] = {
    "Woodworking": "CRP",
    "Smithing": "BSM",
    "Armorcraft": "ARM",
    "Goldsmithing": "GSM",
    "Leatherworking": "LTW",
    "Clothcraft": "WVR",
    "Alchemy": "ALC",
    "Cooking": "CUL",
}

# Hardcoded job icon URLs (static across game patches)
JOB_ICONS: dict[str, str] = {
    job: f"{XIVAPI_BASE}/cj/1/{name}.png"
    for job, name in [
        ("CRP", "carpenter"), ("BSM", "blacksmith"), ("ARM", "armorer"),
        ("GSM", "goldsmith"), ("LTW", "leatherworker"), ("WVR", "weaver"),
        ("ALC", "alchemist"), ("CUL", "culinarian"),
    ]
}

# Fields to request from XIVAPI v2 Recipe sheet
_V2_RECIPE_FIELDS = (
    "RowId,ItemResult.Name,ItemResult.ItemUICategory.Name,"
    "AmountResult,CraftType.Name,RecipeLevelTable.ClassJobLevel,"
    "AmountIngredient,Ingredient[].Name,Ingredient[].row_id,Ingredient[].PriceMid"
)
# Page size for XIVAPI v2 (max 500 per request)
_V2_PAGE_SIZE = 500
# Safe upper bound for recipe row IDs (empirically ~38000 as of Dawntrail 7.2;
# extra pages past the real max return 0 rows and are harmlessly discarded)
_V2_MAX_AFTER = 50000

# Fields to request from XIVAPI v2 GatheringItem sheet
_V2_GATHERING_FIELDS = "RowId,Item"
_V2_GATHERING_PAGE_SIZE = 500
# GatheringItem has ~4000 rows; 10000 is a safe upper bound
_V2_GATHERING_MAX_AFTER = 10000

# Max concurrent XIVAPI page requests to avoid rate-limiting
XIVAPI_CONCURRENCY = 5
# Universalis batch size (API accepts up to 100 items per request)
UNIVERSALIS_CHUNK = 100
# Max concurrent Universalis connections (API hard cap: 8 per IP)
UNIVERSALIS_CONCURRENCY = 8

# ---------------------------------------------------------------------------
# Cache helpers
# ---------------------------------------------------------------------------


def _cache_path(key: str) -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return CACHE_DIR / f"{key}.json"


def _load_cache(key: str):
    path = _cache_path(key)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if time.time() - data.get("timestamp", 0) > RECIPE_CACHE_TTL:
            return None
        return data.get("payload")
    except Exception:
        return None


def _save_cache(key: str, payload) -> None:
    path = _cache_path(key)
    path.write_text(
        json.dumps({"timestamp": time.time(), "payload": payload}, ensure_ascii=False),
        encoding="utf-8",
    )


def get_cache_info() -> dict:
    path = _cache_path(RECIPE_CACHE_KEY)
    if not path.exists():
        return {"exists": False, "age_hours": None, "count": 0}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        age_hours = (time.time() - data.get("timestamp", 0)) / 3600
        count = len(data.get("payload", []))
        stale = age_hours > (RECIPE_CACHE_TTL / 3600)
        return {"exists": True, "age_hours": round(age_hours, 1), "count": count, "stale": stale}
    except Exception:
        return {"exists": False, "age_hours": None, "count": 0}


def clear_recipe_cache() -> None:
    path = _cache_path(RECIPE_CACHE_KEY)
    if path.exists():
        path.unlink()


# ---------------------------------------------------------------------------
# XIVAPI — Recipe fetching
# ---------------------------------------------------------------------------


async def _fetch_recipe_page_v2(client: httpx.AsyncClient, after: int) -> list[dict]:
    """Fetch one page of recipes from XIVAPI v2 using cursor-based pagination."""
    params: dict = {"fields": _V2_RECIPE_FIELDS, "limit": _V2_PAGE_SIZE, "after": after}
    resp = await client.get(
        f"{XIVAPI_V2_BASE}/sheet/Recipe",
        params=params,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("rows", [])


async def fetch_all_recipes() -> list[dict]:
    """Return all FFXIV crafting recipes, cached for 24 hours.

    Uses XIVAPI v2 (beta.xivapi.com) which is kept up-to-date with all
    game patches, including the latest Dawntrail content.
    """
    cached = _load_cache(RECIPE_CACHE_KEY)
    if cached is not None:
        return cached

    semaphore = asyncio.Semaphore(XIVAPI_CONCURRENCY)

    # Recipe row IDs in XIVAPI v2 are sequential integers. after=N returns
    # rows with row_id > N.  We issue concurrent requests for all expected
    # ranges; pages past the real max simply return [] and are ignored.
    after_values = list(range(0, _V2_MAX_AFTER, _V2_PAGE_SIZE))

    async def _fetch_with_sem(client: httpx.AsyncClient, after: int) -> list[dict]:
        async with semaphore:
            return await _fetch_recipe_page_v2(client, after)

    async with httpx.AsyncClient() as client:
        tasks = [_fetch_with_sem(client, after) for after in after_values]
        pages = await asyncio.gather(*tasks)

    all_rows: list[dict] = []
    for page_rows in pages:
        all_rows.extend(page_rows)

    _save_cache(RECIPE_CACHE_KEY, all_rows)
    return all_rows


async def _fetch_gathering_page_v2(client: httpx.AsyncClient, after: int) -> list[dict]:
    """Fetch one page of GatheringItem rows from XIVAPI v2."""
    params: dict = {"fields": _V2_GATHERING_FIELDS, "limit": _V2_GATHERING_PAGE_SIZE, "after": after}
    resp = await client.get(
        f"{XIVAPI_V2_BASE}/sheet/GatheringItem",
        params=params,
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json().get("rows", [])


async def fetch_gatherable_ids() -> set[int]:
    """Return a set of item IDs that can be gathered (Mining/Botany/Fishing), cached for 24 hours."""
    cached = _load_cache(GATHERING_CACHE_KEY)
    if cached is not None:
        return set(cached)

    after_values = list(range(0, _V2_GATHERING_MAX_AFTER, _V2_GATHERING_PAGE_SIZE))

    async with httpx.AsyncClient() as client:
        tasks = [_fetch_gathering_page_v2(client, after) for after in after_values]
        pages = await asyncio.gather(*tasks, return_exceptions=True)

    item_ids: list[int] = []
    for page_rows in pages:
        if not isinstance(page_rows, list):
            continue
        for row in page_rows:
            fields = row.get("fields") or {}
            item_ref = fields.get("Item") or {}
            item_id = item_ref.get("row_id")
            if item_id and item_id > 0:
                item_ids.append(item_id)

    _save_cache(GATHERING_CACHE_KEY, item_ids)
    return set(item_ids)


def _parse_recipe(raw: dict) -> Optional[dict]:
    """Convert a raw XIVAPI v2 recipe row into a clean internal format."""
    try:
        fields = raw.get("fields") or {}
        row_id = raw.get("row_id", 0)

        item_result = fields.get("ItemResult") or {}
        item_fields = item_result.get("fields") or {}
        item_id = item_result.get("row_id")
        item_name = (item_fields.get("Name") or "").strip()
        if not item_id or not item_name:
            return None

        item_ui_cat = item_fields.get("ItemUICategory") or {}
        item_category = ((item_ui_cat.get("fields") or {}).get("Name") or "").strip()

        craft_type = fields.get("CraftType") or {}
        craft_type_name = ((craft_type.get("fields") or {}).get("Name") or "").strip()
        job_abbr_val = CRAFT_TYPE_TO_JOB.get(craft_type_name, "")
        if not job_abbr_val:
            return None

        amounts = fields.get("AmountIngredient") or []
        ingredients_raw = fields.get("Ingredient") or []
        ingredients: list[dict] = []
        for i, ing in enumerate(ingredients_raw):
            amount = amounts[i] if i < len(amounts) else 0
            if not amount or amount <= 0:
                continue
            ing_id = ing.get("row_id")
            ing_fields = ing.get("fields") or {}
            ing_name = (ing_fields.get("Name") or "").strip()
            if ing_id and ing_name:
                npc_price = int(ing_fields.get("PriceMid") or 0)
                ingredients.append({
                    "id": ing_id,
                    "name": ing_name,
                    "amount": int(amount),
                    "npc_price": npc_price,
                })

        if not ingredients:
            return None

        recipe_level_table = fields.get("RecipeLevelTable") or {}
        level = ((recipe_level_table.get("fields") or {}).get("ClassJobLevel") or 0)

        return {
            "id": row_id,
            "job": job_abbr_val,
            "job_icon": JOB_ICONS.get(job_abbr_val, ""),
            "item_id": item_id,
            "item_name": item_name,
            "amount_result": max(int(fields.get("AmountResult") or 1), 1),
            "level": level,
            "item_category": item_category,
            "ingredients": ingredients,
        }
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Universalis — Market data
# ---------------------------------------------------------------------------


async def _fetch_market_chunk(
    client: httpx.AsyncClient, world: str, item_ids: list[int], stats_within_ms: int = 0
) -> dict:
    """Fetch aggregate market data for up to 100 items, with retry on rate-limit."""
    ids_str = ",".join(str(i) for i in item_ids)
    is_multi = len(item_ids) > 1
    prefix = "items." if is_multi else ""
    needed = [
        "minPriceNQ", "currentAveragePriceNQ", "averagePriceNQ", "minPrice",
        "minPriceHQ", "currentAveragePriceHQ", "averagePriceHQ",
        "nqSaleVelocity", "hqSaleVelocity", "recentHistory",
    ]
    fields = ",".join(f"{prefix}{f}" for f in needed)
    # entries=500: enough history to cover a week for popular world-level items
    req_params: dict = {"fields": fields, "entries": "500"}
    if stats_within_ms > 0:
        req_params["statsWithin"] = str(stats_within_ms)

    # Retry up to 3 times on 429/503 with exponential backoff
    resp: httpx.Response | None = None
    for attempt in range(3):
        resp = await client.get(
            f"{UNIVERSALIS_BASE}/{world}/{ids_str}",
            params=req_params,
            timeout=30,
        )
        if resp.status_code in (429, 503):
            await asyncio.sleep(2 ** attempt)  # 1s, 2s, 4s
            continue
        resp.raise_for_status()
        data = resp.json()
        if is_multi:
            return data.get("items", {})
        return {str(item_ids[0]): data} if data else {}
    assert resp is not None
    raise httpx.HTTPStatusError(
        f"Rate limited after retries", request=resp.request, response=resp
    )


async def fetch_market_data(
    world: str,
    item_ids: list[int],
    stats_within_days: int = 0,
    on_progress=None,
    progress_start: int = 30,
    progress_end: int = 90,
) -> tuple[dict[int, dict], int]:
    """Fetch Universalis market data for a list of item IDs.

    If *on_progress* is provided it is called as ``await on_progress(pct, msg)``
    as each chunk completes, where pct advances linearly from *progress_start*
    to *progress_end*.
    """
    if not item_ids:
        return {}, 0

    chunks = [
        item_ids[i : i + UNIVERSALIS_CHUNK]
        for i in range(0, len(item_ids), UNIVERSALIS_CHUNK)
    ]
    total_chunks = len(chunks)
    result: dict[int, dict] = {}
    stats_within_ms = stats_within_days * 86400 * 1000 if stats_within_days > 0 else 0
    failed_chunks = 0
    completed = 0
    semaphore = asyncio.Semaphore(UNIVERSALIS_CONCURRENCY)

    async def _fetch_with_sem(client: httpx.AsyncClient, chunk: list[int]) -> dict:
        nonlocal completed
        async with semaphore:
            res = await _fetch_market_chunk(client, world, chunk, stats_within_ms)
        completed += 1
        if on_progress:
            pct = progress_start + int(completed / total_chunks * (progress_end - progress_start))
            await on_progress(pct, f"Fetching market data… ({completed}/{total_chunks})")
        return res

    async with httpx.AsyncClient() as client:
        tasks = [_fetch_with_sem(client, chunk) for chunk in chunks]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

    for resp in responses:
        if not isinstance(resp, dict):
            failed_chunks += 1
            continue
        for item_id_str, item_data in resp.items():
            try:
                result[int(item_id_str)] = item_data
            except (ValueError, TypeError):
                pass

    return result, failed_chunks


def _best_sell_price(item_data: dict) -> float:
    """Return the best realistic sell price for a crafted item.

    Crafters almost always produce HQ, so we prefer the HQ floor price.
    Low NQ listings (e.g. failed crafts dumped cheaply) are irrelevant
    to a competent crafter and must not drag the sell estimate down.

    Only uses *current* listing data, never historical sale averages
    (averagePriceNQ/HQ).  Historical averages can be arbitrarily stale —
    an item last sold months ago at 100k will still show that average even
    if the real market is 2k — causing absurd profit estimates for items
    with no active listings.  Items with no current listings return 0 and
    are excluded from results.
    """
    # Primary: HQ floor — the price a crafter would actually list at
    min_hq = item_data.get("minPriceHQ") or 0
    if min_hq > 0:
        return min_hq
    # Secondary: NQ floor (items with no HQ market)
    min_nq = item_data.get("minPriceNQ") or 0
    if min_nq > 0:
        return min_nq
    # Tertiary: current listing averages (mean of active listings, not history)
    avg_hq = item_data.get("currentAveragePriceHQ") or 0
    if avg_hq > 0:
        return avg_hq
    avg_nq = item_data.get("currentAveragePriceNQ") or 0
    if avg_nq > 0:
        return avg_nq
    # minPrice is also a current-listing field (min across both qualities)
    return item_data.get("minPrice") or 0
    # NOTE: averagePriceNQ/HQ (historical sale averages) intentionally NOT used —
    # stale history causes absurd prices when there are no active listings.


def _best_buy_price(item_data: dict) -> int:
    """Return the cheapest NQ buy price for an ingredient.

    Falls back through progressively less precise estimates:
    1. Active listing floors (most accurate)
    2. Current listing averages
    3. Recent sale price averages (catches items with no live listings)
    """
    return (
        item_data.get("minPriceNQ")
        or item_data.get("minPriceHQ")
        or item_data.get("currentAveragePriceNQ")
        or item_data.get("currentAveragePriceHQ")
        or int(item_data.get("averagePriceNQ") or 0)
        or int(item_data.get("averagePriceHQ") or 0)
        or 0
    )


# ---------------------------------------------------------------------------
# Main analysis
# ---------------------------------------------------------------------------


async def analyze(
    world: str,
    job_abbr: str = "ALL",
    min_profit: int = 0,
    min_velocity: float = 0.0,
    limit: int = 50,
    sort_by: str = "profit",
    min_level: int = 0,
    max_level: int = 0,
    item_search: str = "",
    item_category: str = "",
    stats_within_days: int = 0,
    on_progress=None,
) -> dict:
    """
    Analyze crafting profitability.

    Returns a dict with 'recipes' (list of profit records), 'total', 'world', 'job'.
    """
    # Load and filter recipes
    if on_progress:
        await on_progress(5, "Loading recipes…")
    raw_recipes = await fetch_all_recipes()

    # Build full set of craftable item IDs from all recipes (before filtering)
    craftable_ids: set[int] = set()
    for raw in raw_recipes:
        item_ref = ((raw.get("fields") or {}).get("ItemResult") or {})
        item_id = item_ref.get("row_id")
        if item_id:
            craftable_ids.add(item_id)

    # Fetch gatherable IDs (cached after first call). Non-fatal: badges fall back to "buy" on error.
    if on_progress:
        await on_progress(15, "Loading item data…")
    try:
        gatherable_ids = await fetch_gatherable_ids()
    except Exception:
        gatherable_ids = set()

    abbr_filter: Optional[str] = None
    if job_abbr.upper() != "ALL":
        if job_abbr.upper() not in JOBS:
            return {
                "error": f"Unknown job: {job_abbr}",
                "recipes": [],
                "total": 0,
                "world": world,
                "job": job_abbr,
            }
        abbr_filter = job_abbr.upper()

    recipes: list[dict] = []
    search_terms = [t.strip().lower() for t in item_search.split(",") if t.strip()] if item_search else []
    # item_category may be a comma-separated list; any match = include (OR logic)
    category_terms = [t.strip().lower() for t in item_category.split(",") if t.strip()] if item_category else []
    for raw in raw_recipes:
        parsed = _parse_recipe(raw)
        if parsed is None:
            continue
        if abbr_filter is not None and parsed["job"] != abbr_filter:
            continue
        if min_level > 0 and parsed["level"] < min_level:
            continue
        if max_level > 0 and parsed["level"] > max_level:
            continue
        if search_terms:
            item_name_lower = parsed["item_name"].lower()
            if not any(t in item_name_lower for t in search_terms):
                continue
        if category_terms:
            cat_lower = parsed.get("item_category", "").lower()
            if not any(t in cat_lower for t in category_terms):
                continue
        recipes.append(parsed)

    if not recipes:
        return {"recipes": [], "total": 0, "world": world, "job": job_abbr.upper()}

    # Collect every unique item ID that needs a price
    all_ids: set[int] = set()
    for recipe in recipes:
        all_ids.add(recipe["item_id"])
        for ing in recipe["ingredients"]:
            all_ids.add(ing["id"])

    if on_progress:
        await on_progress(28, f"Querying market for {len(all_ids)} items…")
    market, failed_chunks = await fetch_market_data(
        world, sorted(all_ids), stats_within_days, on_progress=on_progress
    )

    # Calculate profitability
    if on_progress:
        await on_progress(92, "Calculating profitability…")
    week_cutoff = time.time() - 7 * 86400  # fixed 7-day window for weekly columns
    results: list[dict] = []
    stats_no_price = 0
    stats_no_ingredients = 0
    stats_velocity_filtered = 0
    stats_profit_filtered = 0
    stats_suspicious = 0

    for recipe in recipes:
        sell_data = market.get(recipe["item_id"], {})
        sell_price = _best_sell_price(sell_data)
        if sell_price <= 0:
            stats_no_price += 1
            continue

        total_cost = 0
        ingredients_detail: list[dict] = []
        valid = True

        for ing in recipe["ingredients"]:
            ing_data = market.get(ing["id"], {})
            market_price = _best_buy_price(ing_data)
            npc_price = ing.get("npc_price", 0)
            # Use NPC price when it's cheaper than the market price
            if npc_price > 0 and (market_price <= 0 or npc_price < market_price):
                unit_price = npc_price
                ing_source = "npc"
            elif market_price > 0:
                unit_price = market_price
                if ing["id"] in craftable_ids:
                    ing_source = "craft"
                elif ing["id"] in gatherable_ids:
                    ing_source = "gather"
                else:
                    ing_source = "buy"
            else:
                valid = False
                break
            subtotal = unit_price * ing["amount"]
            total_cost += subtotal
            ingredients_detail.append({
                "name": ing["name"],
                "amount": ing["amount"],
                "unit_price": unit_price,
                "total": subtotal,
                "source": ing_source,
            })

        if not valid or total_cost <= 0:
            stats_no_ingredients += 1
            continue

        velocity = float((sell_data.get("nqSaleVelocity") or 0)) + float((sell_data.get("hqSaleVelocity") or 0))

        # Weekly stats from actual sale history (last 7 days)
        history = sell_data.get("recentHistory") or []
        weekly_entries = [e for e in history if (e.get("timestamp") or 0) >= week_cutoff]
        weekly_purchases = len(weekly_entries)
        last_sold = max((e.get("timestamp") or 0) for e in history) if history else None

        # Strip per-entry outliers before computing the average.
        # With ≥ 3 transactions, any sale whose unit price is more than
        # MAX_PRICE_DIVERGENCE_RATIO× the median is treated as a gift/manipulation
        # trade and excluded so it cannot skew the weighted mean.
        clean_entries = weekly_entries
        if len(weekly_entries) >= 3:
            _prices = sorted(e.get("pricePerUnit", 0) for e in weekly_entries)
            _median = _prices[len(_prices) // 2]
            if _median > 0:
                clean_entries = [
                    e for e in weekly_entries
                    if (_median / MAX_PRICE_DIVERGENCE_RATIO)
                    <= e.get("pricePerUnit", 0)
                    <= (_median * MAX_PRICE_DIVERGENCE_RATIO)
                ]
                # If outlier removal wiped everything (shouldn't happen), keep originals
                if not clean_entries:
                    clean_entries = weekly_entries

        weekly_qty_sold = sum(e.get("quantity", 0) for e in clean_entries)
        weekly_gil_earned = sum(e.get("pricePerUnit", 0) * e.get("quantity", 0) for e in clean_entries)

        # Average sold price per unit from recent history; fall back to listing floor
        if weekly_qty_sold > 0:
            avg_unit_price = weekly_gil_earned / weekly_qty_sold
        else:
            avg_unit_price = sell_price

        # Filter suspicious items: avg sold price (after outlier removal) still
        # diverges wildly from the current listing floor.
        if weekly_qty_sold > 0 and sell_price > 0:
            _ratio = avg_unit_price / sell_price if avg_unit_price >= sell_price else sell_price / avg_unit_price
            if _ratio > MAX_PRICE_DIVERGENCE_RATIO:
                stats_suspicious += 1
                continue

        revenue = avg_unit_price * recipe["amount_result"]
        profit = revenue - total_cost
        margin = (profit / revenue * 100) if revenue > 0 else 0

        if velocity < min_velocity:
            stats_velocity_filtered += 1
            continue
        if profit < min_profit:
            stats_profit_filtered += 1
            continue

        results.append({
            "recipe_id": recipe["id"],
            "item_name": recipe["item_name"],
            "item_id": recipe["item_id"],
            "job": recipe["job"],
            "job_icon": recipe["job_icon"],
            "level": recipe["level"],
            "amount_result": recipe["amount_result"],
            "sell_price": round(revenue),
            "revenue": round(revenue),
            "cost": total_cost,
            "profit": round(profit),
            "margin": round(margin, 1),
            "velocity": round(velocity, 2),
            "weekly_qty_sold": weekly_qty_sold,
            "weekly_purchases": weekly_purchases,
            "weekly_gil_earned": weekly_gil_earned,
            "last_sold": last_sold,
            "ingredients": ingredients_detail,
        })

    # Sort descending by chosen field
    valid_sort_fields = {"profit", "margin", "weekly_gil_earned", "weekly_qty_sold", "weekly_purchases", "velocity", "level", "revenue", "cost"}
    field = sort_by if sort_by in valid_sort_fields else "profit"
    results.sort(key=lambda x: x[field], reverse=True)

    # Deduplicate by item_id, merging job info into arrays so the limit applies
    # to unique items (not per-job recipe entries for the same item).
    seen_items: dict[int, dict] = {}
    deduped: list[dict] = []
    for r in results:
        if r["item_id"] not in seen_items:
            r = {**r, "jobs": [r["job"]], "job_icons": [r["job_icon"]]}
            seen_items[r["item_id"]] = r
            deduped.append(r)
        else:
            existing = seen_items[r["item_id"]]
            if r["job"] not in existing["jobs"]:
                existing["jobs"].append(r["job"])
                existing["job_icons"].append(r["job_icon"])
    results = deduped

    num_ids = len(all_ids)
    total_chunks = max(1, (num_ids + UNIVERSALIS_CHUNK - 1) // UNIVERSALIS_CHUNK) if num_ids else 1
    filter_stats = {
        "recipes_matched": len(recipes),
        "no_price": stats_no_price,
        "no_ingredients": stats_no_ingredients,
        "velocity_filtered": stats_velocity_filtered,
        "profit_filtered": stats_profit_filtered,
        "suspicious_filtered": stats_suspicious,
        "market_api_failures": failed_chunks,
        "market_api_total_chunks": total_chunks,
    }
    return {
        "recipes": results[:limit],
        "total": len(results),
        "world": world,
        "job": job_abbr.upper(),
        "filter_stats": filter_stats,
    }
