import httpx, json, asyncio, time

MAX_PRICE_DIVERGENCE_RATIO = 5.0

async def main():
    url = "https://universalis.app/api/v2/Raiden/3742"
    params = {
        "fields": "minPriceNQ,minPriceHQ,currentAveragePriceNQ,currentAveragePriceHQ,nqSaleVelocity,hqSaleVelocity,recentHistory",
        "entries": "500"
    }
    async with httpx.AsyncClient() as c:
        r = await c.get(url, params=params, timeout=15)
        data = r.json()

    week_cutoff = time.time() - 7 * 86400
    history = data.get("recentHistory", [])
    weekly_entries = [e for e in history if (e.get("timestamp") or 0) >= week_cutoff]

    min_hq = data.get("minPriceHQ") or 0
    min_nq = data.get("minPriceNQ") or 0
    sell_price = min_hq or min_nq

    # Apply outlier filter
    clean_entries = weekly_entries
    if len(weekly_entries) >= 3:
        prices = sorted(e.get("pricePerUnit", 0) for e in weekly_entries)
        median = prices[len(prices) // 2]
        if median > 0:
            clean_entries = [
                e for e in weekly_entries
                if (median / MAX_PRICE_DIVERGENCE_RATIO)
                <= e.get("pricePerUnit", 0)
                <= (median * MAX_PRICE_DIVERGENCE_RATIO)
            ]
            if not clean_entries:
                clean_entries = weekly_entries

    weekly_qty = sum(e.get("quantity", 0) for e in clean_entries)
    weekly_gil = sum(e.get("pricePerUnit", 0) * e.get("quantity", 0) for e in clean_entries)
    avg_sold = weekly_gil / weekly_qty if weekly_qty > 0 else sell_price

    if weekly_qty > 0 and sell_price > 0:
        ratio = avg_sold / sell_price if avg_sold >= sell_price else sell_price / avg_sold
        filtered = ratio > MAX_PRICE_DIVERGENCE_RATIO
        ratio_str = f"{ratio:.2f}x  -> {'FILTERED OUT' if filtered else 'passes'}"
    else:
        ratio_str = "N/A"
        filtered = False

    removed = [e for e in weekly_entries if e not in clean_entries]

    print(f"sell_price (current listing): {sell_price:,}")
    print(f"Raw weekly entries: {len(weekly_entries)}, After outlier trim: {len(clean_entries)}")
    if removed:
        print("Removed as outliers:")
        for e in removed:
            print(f"  {'HQ' if e.get('hq') else 'NQ'} @ {e.get('pricePerUnit'):,} gil")
    print(f"avg_sold (cleaned): {avg_sold:,.0f}")
    print(f"divergence ratio: {ratio_str}")

asyncio.run(main())
