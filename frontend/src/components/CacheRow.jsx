import { Button } from "./ui/button";

export default function CacheRow({ info, onRefresh }) {
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
        <div className="flex items-center gap-2 mt-1.5">
            <p className="text-[11px] text-muted-foreground flex-1">
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
            <Button variant="ghost" size="sm" onClick={onRefresh}>
                {stale ? "Refresh" : "Clear"}
            </Button>
        </div>
    );
}
