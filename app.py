"""
FFXIV Marketboard Analyst — FastAPI Application
Run with: python app.py  (or uvicorn app:app --reload)
"""

import asyncio
import json
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from analyzer import JOBS, analyze, get_cache_info

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="FFXIV Marketboard Analyst",
    description="Find profitable crafting items using live Universalis market data.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# World / datacenter data
# ---------------------------------------------------------------------------

DATACENTERS: dict[str, dict[str, list[str]]] = {
    "North America": {
        "Aether": [
            "Adamantoise", "Cactuar", "Faerie", "Gilgamesh",
            "Jenova", "Midgardsormr", "Sargatanas", "Siren",
        ],
        "Crystal": [
            "Balmung", "Brynhildr", "Coeurl", "Diabolos",
            "Goblin", "Malboro", "Mateus", "Zalera",
        ],
        "Dynamis": [
            "Cuchulainn", "Golem", "Halicarnassus", "Kraken",
            "Maduin", "Marilith", "Rafflesia", "Seraph",
        ],
        "Primal": [
            "Behemoth", "Excalibur", "Exodus", "Famfrit",
            "Hyperion", "Lamia", "Leviathan", "Ultros",
        ],
    },
    "Europe": {
        "Chaos": [
            "Cerberus", "Louisoix", "Moogle", "Omega",
            "Phantom", "Ragnarok", "Sagittarius", "Spriggan",
        ],
        "Light": [
            "Alpha", "Lich", "Odin", "Phoenix",
            "Raiden", "Shiva", "Twintania", "Zodiark",
        ],
    },
    "Japan": {
        "Elemental": [
            "Aegis", "Atomos", "Carbuncle", "Garuda",
            "Gungnir", "Kujata", "Tonberry", "Typhon",
        ],
        "Gaia": [
            "Alexander", "Bahamut", "Durandal", "Fenrir",
            "Ifrit", "Ridill", "Tiamat", "Ultima",
        ],
        "Mana": [
            "Anima", "Asura", "Chocobo", "Hades",
            "Ixion", "Masamune", "Pandaemonium", "Titan",
        ],
        "Meteor": [
            "Belias", "Mandragora", "Ramuh", "Shinryu",
            "Unicorn", "Valefor", "Yojimbo", "Zeromus",
        ],
    },
    "Oceania": {
        "Materia": [
            "Bismarck", "Ravana", "Sephirot", "Sophia", "Zurvan",
        ],
    },
}

# ---------------------------------------------------------------------------
# API routes
# ---------------------------------------------------------------------------


@app.get("/api/jobs")
async def get_jobs() -> list[str]:
    """List available crafting job abbreviations."""
    return list(JOBS.keys())


@app.get("/api/worlds")
async def get_worlds() -> dict:
    """Return datacenter / world hierarchy."""
    return DATACENTERS


@app.get("/api/cache/status")
async def cache_status() -> dict:
    """Return the current recipe cache status."""
    return get_cache_info()


@app.get("/api/analyze")
async def analyze_endpoint(
    world: str = Query(..., description="World or Datacenter name, e.g. Gilgamesh or Crystal"),
    job: str = Query("ALL", description="Job abbreviation (CRP, BSM, ARM, GSM, LTW, WVR, ALC, CUL) or ALL"),
    min_profit: int = Query(0, ge=0, description="Minimum profit per craft in gil"),
    min_velocity: float = Query(0.0, ge=0.0, description="Minimum daily NQ sale velocity"),
    limit: int = Query(50, ge=1, le=200, description="Maximum number of results"),
    sort_by: str = Query(
        "profit",
        description="Sort field: profit | margin | profit_per_day | velocity | level | revenue | cost",
    ),
    min_level: int = Query(0, ge=0, description="Minimum recipe level (0 = no minimum)"),
    max_level: int = Query(0, ge=0, description="Maximum recipe level (0 = no maximum)"),
    item_search: str = Query("", description="Comma-separated item name substrings to filter by"),
    item_category: str = Query("", description="Item category substring filter (e.g. furnish, meal)"),
    stats_within_days: int = Query(0, ge=0, description="Limit sale stats to last N days (0 = Universalis default)"),
) -> JSONResponse:
    """Main analysis endpoint. Returns ranked crafting profit opportunities."""
    try:
        result = await analyze(
            world=world,
            job_abbr=job,
            min_profit=min_profit,
            min_velocity=min_velocity,
            limit=limit,
            sort_by=sort_by,
            min_level=min_level,
            max_level=max_level,
            item_search=item_search,
            item_category=item_category,
            stats_within_days=stats_within_days,
        )
        return JSONResponse(content=result)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


_ANALYZE_PARAMS = dict(
    world=Query(..., description="World or Datacenter name, e.g. Gilgamesh or Crystal"),
    job=Query("ALL", description="Job abbreviation or ALL"),
    min_profit=Query(0, ge=0),
    min_velocity=Query(0.0, ge=0.0),
    limit=Query(50, ge=1, le=200),
    sort_by=Query("profit"),
    min_level=Query(0, ge=0),
    max_level=Query(0, ge=0),
    item_search=Query(""),
    item_category=Query(""),
    stats_within_days=Query(0, ge=0),
)


@app.get("/api/analyze/stream")
async def analyze_stream_endpoint(
    world: str = Query(...),
    job: str = Query("ALL"),
    min_profit: int = Query(0, ge=0),
    min_velocity: float = Query(0.0, ge=0.0),
    limit: int = Query(50, ge=1, le=200),
    sort_by: str = Query("profit"),
    min_level: int = Query(0, ge=0),
    max_level: int = Query(0, ge=0),
    item_search: str = Query(""),
    item_category: str = Query(""),
    stats_within_days: int = Query(0, ge=0),
):
    """SSE endpoint that streams analysis progress then the final result."""
    queue: asyncio.Queue = asyncio.Queue()

    async def run():
        async def on_progress(pct: int, msg: str) -> None:
            await queue.put({"type": "progress", "pct": pct, "msg": msg})

        try:
            result = await analyze(
                world=world,
                job_abbr=job,
                min_profit=min_profit,
                min_velocity=min_velocity,
                limit=limit,
                sort_by=sort_by,
                min_level=min_level,
                max_level=max_level,
                item_search=item_search,
                item_category=item_category,
                stats_within_days=stats_within_days,
                on_progress=on_progress,
            )
            await queue.put({"type": "done", "data": result})
        except Exception as exc:
            await queue.put({"type": "error", "msg": str(exc)})

    asyncio.create_task(run())

    async def event_stream():
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=180.0)
            except asyncio.TimeoutError:
                yield f"data: {json.dumps({'type': 'error', 'msg': 'Analysis timed out — Universalis may be slow, try again'})}\n\n"
                break
            yield f"data: {json.dumps(event)}\n\n"
            if event["type"] in ("done", "error"):
                break

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Static frontend — must be mounted AFTER API routes
# ---------------------------------------------------------------------------

STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(exist_ok=True)
if STATIC_DIR.exists() and any(STATIC_DIR.iterdir()):
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Starting FFXIV Marketboard Analyst on http://127.0.0.1:8000")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
