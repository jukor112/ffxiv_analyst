import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { apiFetch, analyzeStream } from "./utils/api";
import { STRING_COLS } from "./utils/format";
import Header from "./components/Header";
import Controls from "./components/Controls";
import StatusBar from "./components/StatusBar";
import ProgressBar from "./components/ProgressBar";
import ResultsTable from "./components/ResultsTable";
import EmptyState from "./components/EmptyState";

export default function App() {
    const [worlds, setWorlds] = useState({});
    const [cacheInfo, setCacheInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressMsg, setProgressMsg] = useState("");
    const [status, setStatus] = useState(null);
    const [results, setResults] = useState([]);
    const [meta, setMeta] = useState(null);
    const [sortField, setSortField] = useState("profit");
    const [sortAsc, setSortAsc] = useState(false);
    const [expandedIds, setExpandedIds] = useState(new Set());
    const [hasRun, setHasRun] = useState(false);

    useEffect(() => {
        apiFetch("/api/worlds").then(setWorlds).catch(console.error);
        loadCacheStatus();
    }, []);

    async function loadCacheStatus() {
        try {
            setCacheInfo(await apiFetch("/api/cache/status"));
        } catch {
            setCacheInfo(null);
        }
    }

    async function handleAnalyze({
        world,
        job,
        sortBy,
        minProfit,
        minVelocity,
        limit,
        minLevel,
        maxLevel,
        itemSearch,
        itemCategory,
        statsWithinDays,
    }) {
        setLoading(true);
        setHasRun(true);
        setProgress(0);
        setProgressMsg("");
        setStatus({ type: "loading", msg: `Fetching data for ${world}…` });
        try {
            const params = new URLSearchParams({
                world,
                job,
                min_profit: minProfit,
                min_velocity: minVelocity,
                limit,
                sort_by: sortBy,
                min_level: minLevel,
                max_level: maxLevel,
                item_search: itemSearch,
                item_category: itemCategory,
                stats_within_days: statsWithinDays,
            });
            const result = await analyzeStream(params, (pct, msg) => {
                setProgress(pct);
                setProgressMsg(msg);
            });
            if (result.error) {
                setStatus({ type: "err", msg: `Error: ${result.error}` });
                return;
            }
            const recipes = result.recipes || [];
            // Backend deduplicates by item_id and provides jobs/job_icons arrays;
            // ensure compatibility with any single-job entries that lack those fields.
            const merged = recipes.map((rec) => ({
                ...rec,
                jobs: rec.jobs ?? [rec.job],
                job_icons: rec.job_icons ?? [rec.job_icon],
            }));
            setResults(merged);
            setSortField(sortBy);
            setSortAsc(false);
            setExpandedIds(new Set());
            setMeta({ world: result.world, job: result.job, shown: merged.length, total: result.total });
            if (result.total === 0) {
                const fs = result.filter_stats || {};
                let reason = "No profitable recipes found.";
                if (fs.market_api_failures > 0 && fs.market_api_failures >= fs.market_api_total_chunks) {
                    reason =
                        "Market data unavailable — Universalis API may be down or rate-limiting. Try again in a moment.";
                } else if (fs.recipes_matched === 0) {
                    reason = "No recipes matched the selected filters.";
                } else if (fs.no_price > 0 && fs.velocity_filtered === 0 && fs.profit_filtered === 0) {
                    reason = `${fs.no_price} recipe(s) had no active market listings on ${result.world}.`;
                } else if (fs.velocity_filtered > 0) {
                    reason = `All ${fs.recipes_matched} matched recipes were below the min sales/day threshold on ${result.world}. Try lowering Min Sales/Day.`;
                } else if (fs.no_ingredients > 0) {
                    reason = `${fs.no_ingredients} recipe(s) had ingredients with no market listings on ${result.world}.`;
                } else if (fs.profit_filtered > 0) {
                    reason = `All matched recipes were below the Min Profit threshold.`;
                } else if (fs.market_api_failures > 0) {
                    reason = `Partial market data (${fs.market_api_failures}/${fs.market_api_total_chunks} chunks failed). Try again.`;
                }
                setStatus({ type: "err", msg: reason });
            } else {
                setStatus({ type: "ok", msg: `Analysis complete — ${result.total} profitable recipes found.` });
            }
            loadCacheStatus();
        } catch (e) {
            setStatus({ type: "err", msg: `Request failed: ${e.message}` });
        } finally {
            setLoading(false);
            setProgress(0);
            setProgressMsg("");
        }
    }

    function handleSort(col) {
        const newAsc = col === sortField ? !sortAsc : false;
        setSortAsc(newAsc);
        setSortField(col);
        setResults((prev) =>
            [...prev].sort((a, b) => {
                const va = a[col],
                    vb = b[col];
                if (STRING_COLS.has(col)) {
                    const cmp = String(va).localeCompare(String(vb));
                    return newAsc ? cmp : -cmp;
                }
                return newAsc ? va - vb : vb - va;
            }),
        );
        setExpandedIds(new Set());
    }

    function handleToggle(idx) {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    }

    function handleClear() {
        setResults([]);
        setMeta(null);
        setExpandedIds(new Set());
        setHasRun(false);
        setStatus(null);
    }

    return (
        <>
            <Header />
            <div className="max-w-[1380px] mx-auto px-5 py-5 pb-10">
                <Controls worlds={worlds} cacheInfo={cacheInfo} onAnalyze={handleAnalyze} loading={loading} />

                <StatusBar status={status} />
                <ProgressBar loading={loading} progress={progress} message={progressMsg} />

                <div className="rounded-lg border border-border bg-card overflow-hidden">
                    {/* Card Header */}
                    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border flex-wrap">
                        <p className="text-[12px] text-muted-foreground">
                            {meta ? (
                                <>
                                    Showing <span className="text-primary font-semibold">{meta.shown}</span> of{" "}
                                    <span className="text-primary font-semibold">{meta.total}</span> profitable recipes
                                    on <span className="text-primary font-semibold">{meta.world}</span> · Job:{" "}
                                    <span className="text-primary font-semibold">{meta.job}</span>
                                </>
                            ) : (
                                "No results yet — run an analysis to begin."
                            )}
                        </p>
                        {results.length > 0 && (
                            <button
                                className="border border-border text-muted-foreground text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors duration-150 cursor-pointer"
                                onClick={handleClear}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Table or empty state */}
                    {results.length > 0 ? (
                        <ResultsTable
                            results={results}
                            sortField={sortField}
                            sortAsc={sortAsc}
                            expandedIds={expandedIds}
                            onSort={handleSort}
                            onToggle={handleToggle}
                        />
                    ) : (
                        !loading && <EmptyState hasRun={hasRun} />
                    )}
                </div>
            </div>

            <footer className="border-t border-border/40 mt-2 pb-6 px-5">
                <p className="text-center text-[10px] text-muted-foreground/40 leading-relaxed mx-auto">
                    FINAL FANTASY XIV © SQUARE ENIX CO., LTD. All Rights Reserved. Market data provided by{" "}
                    <a
                        href="https://universalis.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2 hover:text-muted-foreground/70 transition-colors"
                    >
                        Universalis
                    </a>
                    . This tool is not affiliated with, endorsed by, or sponsored by Square Enix.
                </p>
            </footer>
            <Analytics />
            <SpeedInsights />
        </>
    );
}
