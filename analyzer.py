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
RECIPE_CACHE_TTL = 86_400 * 7   # 7 days — time-based fallback when game version unavailable
RECIPE_CACHE_HARD_TTL = 86_400 * 30  # 30-day absolute cap
RECIPE_CACHE_KEY = "recipes_v5"  # v5 = actually fetch ingredient PriceMid (NPC shop price)
GATHERING_CACHE_KEY = "gathering_v1"
MARKETABLE_CACHE_KEY = "marketable_v1"
MARKETABLE_CACHE_TTL = 86_400  # 1 day
ITEM_NAMES_CACHE_KEY = "item_names_v1"
ITEM_NAMES_CONCURRENCY = 20  # Max concurrent XIVAPI individual name lookups

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


def _load_cache_raw(key: str) -> Optional[dict]:
    """Load full cache envelope; returns None if missing or past the hard TTL."""
    path = _cache_path(key)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if time.time() - data.get("timestamp", 0) > RECIPE_CACHE_HARD_TTL:
            return None
        return data
    except Exception:
        return None


def _load_cache(key: str):
    """Return cached payload if within the time-based TTL, else None."""
    raw = _load_cache_raw(key)
    if raw is None:
        return None
    if time.time() - raw.get("timestamp", 0) > RECIPE_CACHE_TTL:
        return None
    return raw.get("payload")


def _save_cache(key: str, payload, game_version: str = "", max_row_id: int = 0) -> None:
    path = _cache_path(key)
    path.write_text(
        json.dumps(
            {
                "timestamp": time.time(),
                "payload": payload,
                "game_version": game_version,
                "max_row_id": max_row_id,
            },
            ensure_ascii=False,
        ),
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
        return {
            "exists": True,
            "age_hours": round(age_hours, 1),
            "count": count,
            "stale": stale,
            "game_version": data.get("game_version", ""),
        }
    except Exception:
        return {"exists": False, "age_hours": None, "count": 0}


def clear_recipe_cache() -> None:
    path = _cache_path(RECIPE_CACHE_KEY)
    if path.exists():
        path.unlink()


# ---------------------------------------------------------------------------
# XIVAPI — Game version & Recipe fetching
# ---------------------------------------------------------------------------


async def _fetch_game_version(client: httpx.AsyncClient) -> str:
    """Return the current FFXIV game version string from XIVAPI v2 beta.

    Looks for the entry tagged "latest" in the /version list, e.g. "7.45".
    Returns an empty string on any failure so callers can fall back gracefully.
    """
    try:
        resp = await client.get(f"{XIVAPI_V2_BASE}/version", timeout=10)
        resp.raise_for_status()
        versions = resp.json().get("versions", [])
        for entry in reversed(versions):
            names = entry.get("names", [])
            if "latest" in names:
                # Return the first non-"latest" name, stripping hotfix suffixes
                # e.g. "7.45x2" → "7.45", "7.1" → "7.1"
                non_meta = [n for n in names if n != "latest"]
                raw = non_meta[0] if non_meta else names[0]
                return raw.split("x")[0]
    except Exception:
        pass
    return ""


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
    """Return all FFXIV crafting recipes using patch-based cache invalidation.

    Cache strategy:
    - Same game version  → serve cache regardless of age (up to 30-day hard limit).
    - Version unavailable → fall back to 7-day time-based TTL.
    - Dynamic pagination ceiling: derived from the highest row ID seen on the last
      run plus a 2 000-row buffer, so new-patch recipes are captured without
      wasting requests on thousands of guaranteed-empty pages.
    """
    raw_cache = _load_cache_raw(RECIPE_CACHE_KEY)

    async with httpx.AsyncClient() as client:
        game_version = await _fetch_game_version(client)

        if raw_cache is not None:
            cached_version = raw_cache.get("game_version", "")
            age = time.time() - raw_cache.get("timestamp", 0)

            # Patch-stable: same known version → cache is authoritative
            if game_version and cached_version and game_version == cached_version:
                return raw_cache["payload"]

            # Version unavailable: fall back to time-based TTL
            if not game_version and age <= RECIPE_CACHE_TTL:
                return raw_cache["payload"]

        # Determine dynamic pagination ceiling
        max_after = _V2_MAX_AFTER
        if raw_cache:
            stored_max_row_id = raw_cache.get("max_row_id", 0)
            if stored_max_row_id > 0:
                # 2 000-row buffer comfortably covers any recipes added in a patch
                max_after = stored_max_row_id + 2000

        semaphore = asyncio.Semaphore(XIVAPI_CONCURRENCY)
        after_values = list(range(0, max_after, _V2_PAGE_SIZE))

        async def _fetch_with_sem(c: httpx.AsyncClient, after: int) -> list[dict]:
            async with semaphore:
                return await _fetch_recipe_page_v2(c, after)

        tasks = [_fetch_with_sem(client, after) for after in after_values]
        pages = await asyncio.gather(*tasks)

    all_rows: list[dict] = []
    for page_rows in pages:
        all_rows.extend(page_rows)

    max_row_id = max((row.get("row_id", 0) for row in all_rows), default=0)
    _save_cache(RECIPE_CACHE_KEY, all_rows, game_version=game_version, max_row_id=max_row_id)
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
    """Return a set of item IDs that can be gathered (Mining/Botany/Fishing).

    Uses the same patch-based invalidation strategy as fetch_all_recipes.
    """
    raw_cache = _load_cache_raw(GATHERING_CACHE_KEY)

    async with httpx.AsyncClient() as client:
        game_version = await _fetch_game_version(client)

        if raw_cache is not None:
            cached_version = raw_cache.get("game_version", "")
            age = time.time() - raw_cache.get("timestamp", 0)

            if game_version and cached_version and game_version == cached_version:
                return set(raw_cache["payload"])

            if not game_version and age <= RECIPE_CACHE_TTL:
                return set(raw_cache["payload"])

        after_values = list(range(0, _V2_GATHERING_MAX_AFTER, _V2_GATHERING_PAGE_SIZE))
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

    _save_cache(GATHERING_CACHE_KEY, item_ids, game_version=game_version)
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
            timeout=15,
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
        "Rate limited after retries", request=resp.request, response=resp
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


# ---------------------------------------------------------------------------
# Market Scan — non-craftable / non-gatherable tradeable items (drops, shops)
# ---------------------------------------------------------------------------


async def fetch_marketable_ids() -> set[int]:
    """Return all item IDs that can be listed on the Universalis marketboard.

    Result is cached for MARKETABLE_CACHE_TTL (1 day) since the set rarely changes.
    """
    path = _cache_path(MARKETABLE_CACHE_KEY)
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if time.time() - data.get("timestamp", 0) < MARKETABLE_CACHE_TTL:
                return set(data["payload"])
        except Exception:
            pass

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{UNIVERSALIS_BASE}/marketable", timeout=30)
        resp.raise_for_status()
        ids = resp.json()  # Returns a plain list of integers

    _save_cache(MARKETABLE_CACHE_KEY, ids)
    return set(ids)


async def fetch_item_names(item_ids: set[int]) -> dict[int, dict]:
    """Return a dict of item_id → {name, category} for the given IDs.

    Looks up missing names from XIVAPI v2 and merges them into a persistent cache so
    subsequent calls are instant.  Item names never change, so the cache never expires.
    """
    path = _cache_path(ITEM_NAMES_CACHE_KEY)
    known: dict[int, dict] = {}
    if path.exists():
        try:
            raw = json.loads(path.read_text(encoding="utf-8"))
            known = {int(k): v for k, v in raw.get("payload", {}).items()}
        except Exception:
            pass

    missing = item_ids - set(known.keys())
    if missing:
        semaphore = asyncio.Semaphore(ITEM_NAMES_CONCURRENCY)

        async def _fetch_name(client: httpx.AsyncClient, iid: int) -> tuple[int, dict]:
            async with semaphore:
                try:
                    resp = await client.get(
                        f"{XIVAPI_V2_BASE}/sheet/Item/{iid}",
                        params={"fields": "Name,ItemUICategory.Name"},
                        timeout=10,
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    fields = data.get("fields") or {}
                    name = (fields.get("Name") or "").strip()
                    cat_ref = fields.get("ItemUICategory") or {}
                    category = ((cat_ref.get("fields") or {}).get("Name") or "").strip()
                    return iid, {"name": name or f"Item #{iid}", "category": category or "Unknown"}
                except Exception:
                    return iid, {"name": f"Item #{iid}", "category": "Unknown"}

        async with httpx.AsyncClient() as client:
            results = await asyncio.gather(*[_fetch_name(client, iid) for iid in missing])

        for iid, info in results:
            known[iid] = info

        # Persist updated cache (string keys for JSON serialisation)
        path.write_text(
            json.dumps(
                {"timestamp": time.time(), "payload": {str(k): v for k, v in known.items()}},
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

    return {iid: known.get(iid, {"name": f"Item #{iid}", "category": "Unknown"}) for iid in item_ids}


def _load_special_shop() -> dict[int, list]:
    """Load the bundled special-shop data.  Returns {item_id: [{currency, cost, per}]}.

    Handles both the plain-payload format (historic files kept in cache/) and the
    standard cache-envelope format (timestamp + payload).
    """
    for key in ("special_shop_v2", "special_shop_v1"):
        path = _cache_path(key)
        if path.exists():
            try:
                raw = json.loads(path.read_text(encoding="utf-8"))
                # If the top-level keys look like item-IDs (numeric strings) it's a plain payload;
                # otherwise it's a cache envelope with a nested "payload" key.
                payload = raw if any(k.isdigit() for k in list(raw.keys())[:5]) else raw.get("payload", {})
                return {int(k): v for k, v in payload.items() if k.isdigit()}
            except Exception:
                pass
    return {}


async def analyze_market_scan(
    world: str,
    min_price: int = 0,
    min_velocity: float = 0.0,
    limit: int = 50,
    sort_by: str = "weekly_gil_earned",
    item_search: str = "",
    item_category: str = "",
    stats_within_days: int = 0,
    on_progress=None,
) -> dict:
    """Find profitable non-craftable, non-gatherable tradeable items (drops, shop purchases, etc.).

    Returns a dict with 'items' (list of scan records), 'total', 'world'.
    """
    if on_progress:
        await on_progress(5, "Loading item catalogs…")

    # Fetch craftable and gatherable IDs in parallel
    raw_recipes_task = asyncio.create_task(fetch_all_recipes())
    gatherable_task = asyncio.create_task(fetch_gatherable_ids())

    raw_recipes = await raw_recipes_task
    craftable_ids: set[int] = set()
    for raw in raw_recipes:
        item_ref = ((raw.get("fields") or {}).get("ItemResult") or {})
        if (iid := item_ref.get("row_id")):
            craftable_ids.add(iid)

    try:
        gatherable_ids = await gatherable_task
    except Exception:
        gatherable_ids = set()

    if on_progress:
        await on_progress(15, "Fetching marketable items list…")

    marketable_ids = await fetch_marketable_ids()
    drop_ids = marketable_ids - craftable_ids - gatherable_ids
    drop_ids_list = sorted(drop_ids)

    if on_progress:
        await on_progress(20, f"Scanning market for {len(drop_ids_list):,} items…")

    market, failed_chunks = await fetch_market_data(
        world,
        drop_ids_list,
        stats_within_days,
        on_progress=on_progress,
        progress_start=20,
        progress_end=82,
    )

    if on_progress:
        await on_progress(84, "Filtering candidates…")

    week_cutoff = time.time() - 7 * 86400
    candidates: list[dict] = []

    for item_id, item_data in market.items():
        sell_price = _best_sell_price(item_data)
        if sell_price <= 0 or sell_price < min_price:
            continue

        velocity = (
            float(item_data.get("nqSaleVelocity") or 0)
            + float(item_data.get("hqSaleVelocity") or 0)
        )
        if velocity < min_velocity:
            continue

        history = item_data.get("recentHistory") or []
        weekly_entries = [e for e in history if (e.get("timestamp") or 0) >= week_cutoff]

        # Outlier removal (same as crafting analysis)
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
                ] or weekly_entries

        weekly_qty_sold = sum(e.get("quantity", 0) for e in clean_entries)
        weekly_gil_earned = sum(
            e.get("pricePerUnit", 0) * e.get("quantity", 0) for e in clean_entries
        )
        last_sold = max((e.get("timestamp") or 0) for e in history) if history else None

        candidates.append(
            {
                "item_id": item_id,
                "sell_price": int(sell_price),
                "velocity": round(velocity, 2),
                "weekly_qty_sold": weekly_qty_sold,
                "weekly_gil_earned": weekly_gil_earned,
                "last_sold": last_sold,
            }
        )

    # Sort candidates before name lookup so we only request names for the top slice
    valid_sort_fields = {"weekly_gil_earned", "sell_price", "velocity", "weekly_qty_sold"}
    sort_field = sort_by if sort_by in valid_sort_fields else "weekly_gil_earned"
    candidates.sort(key=lambda x: x[sort_field], reverse=True)

    # Fetch names only for the top candidates (avoids requesting names for thousands of items)
    name_lookup_limit = min(len(candidates), max(limit * 4, 400))
    top_candidates = candidates[:name_lookup_limit]

    if on_progress:
        await on_progress(86, f"Fetching item names for top {len(top_candidates)} items…")

    top_ids = {c["item_id"] for c in top_candidates}
    names = await fetch_item_names(top_ids)

    # Load special-shop source data
    shop_data = _load_special_shop()

    search_terms = [t.strip().lower() for t in item_search.split(",") if t.strip()] if item_search else []
    category_terms = (
        [t.strip().lower() for t in item_category.split(",") if t.strip()] if item_category else []
    )

    if on_progress:
        await on_progress(95, "Building results…")

    results: list[dict] = []
    for c in top_candidates:
        iid = c["item_id"]
        info = names.get(iid, {"name": f"Item #{iid}", "category": "Unknown"})
        item_name = info["name"]
        item_cat = info["category"]

        # Skip items with no name (XIVAPI returned nothing useful)
        if item_name.startswith("Item #"):
            continue

        if search_terms and not any(t in item_name.lower() for t in search_terms):
            continue
        if category_terms and not any(t in item_cat.lower() for t in category_terms):
            continue

        shop_entries = shop_data.get(iid, [])
        if shop_entries:
            source = "shop"
            source_detail = "; ".join(
                f"{e.get('currency', '?')} ×{e.get('cost', '?')}"
                for e in shop_entries[:2]
            )
        else:
            source = "drop"
            source_detail = None

        results.append(
            {
                "item_id": iid,
                "item_name": item_name,
                "item_category": item_cat,
                "source": source,
                "source_detail": source_detail,
                **{k: c[k] for k in ("sell_price", "velocity", "weekly_qty_sold", "weekly_gil_earned", "last_sold")},
            }
        )
        if len(results) >= limit:
            break

    return {
        "items": results,
        "total": len(results),
        "world": world,
        "scan_pool": len(drop_ids_list),
        "candidates_found": len(candidates),
    }
