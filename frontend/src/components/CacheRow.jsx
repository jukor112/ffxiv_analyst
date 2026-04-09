export default function CacheRow({ info }) {
    if (!info) return <p className="text-[11px] text-muted-foreground mt-1.5">Checking cache…</p>;

    const { exists, stale, age_hours, count } = info;

    if (!exists) {
        return (
            <p className="text-[11px] text-muted-foreground mt-1.5">
                ⚠️ No cache — first run will fetch recipes (~30 s)
            </p>
        );
    }

    return (
        <p className="text-[11px] text-muted-foreground mt-1.5">
            {stale ? (
                <>
                    ⚠️ Cache stale ({age_hours}h) — {count} recipes
                </>
            ) : (
                <>
                    ✔ Cache valid ({age_hours}h old, {count} recipes)
                </>
            )}
        </p>
    );
}
