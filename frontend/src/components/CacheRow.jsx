function formatAge(age_hours) {
    if (age_hours >= 24) return `${(age_hours / 24).toFixed(1)}d`;
    return `${age_hours}h`;
}

export default function CacheRow({ info }) {
    if (!info) return <p className="text-[11px] text-muted-foreground mt-1.5">Checking cache…</p>;

    const { exists, stale, age_hours, count, game_version } = info;

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
                    ⚠️ Cache stale ({formatAge(age_hours)}) — {count} recipes
                </>
            ) : (
                <>
                    ✔ Cache valid ({formatAge(age_hours)} old, {count} recipes
                    {game_version ? `, patch ${game_version}` : ""})
                </>
            )}
        </p>
    );
}
