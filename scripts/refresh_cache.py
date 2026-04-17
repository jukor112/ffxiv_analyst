"""
Standalone script to refresh bundled recipe and gathering caches.

Run from the repo root:
    python scripts/refresh_cache.py

Uses the same patch-aware logic as the app:
  - If the game version matches the cached version, nothing is fetched.
  - If the version changed (new patch), recipes/gathering are re-fetched
    from XIVAPI and written to cache/ so the next Vercel deploy bundles them.
"""

import asyncio
import sys
from pathlib import Path

# Ensure the repo root is on the path so analyzer.py can be imported directly.
sys.path.insert(0, str(Path(__file__).parent.parent))

from analyzer import fetch_all_recipes, fetch_gatherable_ids, CACHE_DIR


async def main() -> None:
    print(f"Cache directory: {CACHE_DIR}")

    print("Checking recipe cache…")
    recipes = await fetch_all_recipes()
    print(f"  → {len(recipes)} recipes in cache")

    print("Checking gathering cache…")
    gatherable = await fetch_gatherable_ids()
    print(f"  → {len(gatherable)} gatherable item IDs in cache")

    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
