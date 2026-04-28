import { useState, useRef } from "react";
import useTooltipPosition from "../hooks/useTooltipPosition";
import TooltipPortal from "./TooltipPortal";
import { gil, timeAgo } from "../utils/format";
import IngredientPanel from "./IngredientPanel";

const JOB_STYLES = {
    CRP: { background: "rgba(58,37,16,0.9)", color: "#d08030" },
    BSM: { background: "rgba(37,21,21,0.9)", color: "#d04040" },
    ARM: { background: "rgba(30,21,48,0.9)", color: "#9060d0" },
    GSM: { background: "rgba(40,32,16,0.9)", color: "#c8a030" },
    LTW: { background: "rgba(16,32,21,0.9)", color: "#30b060" },
    WVR: { background: "rgba(14,30,48,0.9)", color: "#3080d0" },
    ALC: { background: "rgba(19,37,19,0.9)", color: "#50c050" },
    CUL: { background: "rgba(37,24,16,0.9)", color: "#c87030" },
};

const JOB_BADGE_CLASS =
    "inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] leading-none font-extrabold tracking-wide whitespace-nowrap overflow-hidden sm:px-1.5 sm:py-0.5";
const JOB_ICON_CLASS = "block w-3.5 h-3.5 shrink-0 object-contain";

export default function ResultRow({ r, idx, expanded, onToggle, asCard = false }) {
    const [excluded, setExcluded] = useState(new Set());
    const [plannedQuantity, setPlannedQuantity] = useState(1);
    const jobBadgeRef = useRef(null);

    const { tooltipPos, show: tipPos, handleShow: handleJobMouseEnter, handleHide: handleJobMouseLeave, above } = useTooltipPosition({
        placement: "centered",
        offset: 6,
    });

    function toggleExclude(i) {
        setExcluded((prev) => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    }

    function resetExcluded() {
        setExcluded(new Set());
    }

    const savedCost =
        excluded.size > 0
            ? (r.ingredients ?? []).reduce((sum, ing, i) => sum + (excluded.has(i) ? ing.total : 0), 0)
            : 0;
    const adjCost = r.cost - savedCost;
    const adjProfit = r.sell_price - adjCost;
    const adjMargin = r.sell_price > 0 ? Math.round((adjProfit / r.sell_price) * 1000) / 10 : r.margin;

    const displayCost = excluded.size > 0 ? adjCost : r.cost;
    const displayProfit = excluded.size > 0 ? adjProfit : r.profit;
    const displayMargin = excluded.size > 0 ? adjMargin : r.margin;

    // For the profit calculator: use adjusted values when ingredients are excluded
    const perCraftProfitForCalc = excluded.size > 0 ? adjProfit : r.profit;

    const profitPos = displayProfit >= 0;
    const profitColor = profitPos ? "#4cba82" : "#e05050";
    const marginVariant =
        displayMargin >= 50
            ? { background: "rgba(76,186,130,0.15)", color: "#4cba82" }
            : displayMargin >= 20
              ? { background: "rgba(200,168,75,0.15)", color: "#c8a84b" }
              : { background: "rgba(224,80,80,0.15)", color: "#e05050" };
    const jobs = r.jobs ?? [r.job];
    const jobIcons = r.job_icons ?? [r.job_icon];

    const tdCls = "px-3 py-2.5 text-[13px] align-middle border-b border-border ";

    if (asCard) {
        const jobBadge =
            jobs.length === 1 ? (
                (() => {
                    const jStyle = JOB_STYLES[jobs[0]] ?? { background: "rgba(30,30,30,0.9)", color: "#888" };
                    return (
                        <span className={JOB_BADGE_CLASS} style={jStyle}>
                            {jobIcons[0] && <img src={jobIcons[0]} alt={jobs[0]} className={JOB_ICON_CLASS} />}
                            {jobs[0]}
                        </span>
                    );
                })()
            ) : (
                <span className={JOB_BADGE_CLASS} style={{ background: "rgba(30,30,46,0.9)", color: "#a0a0c0" }}>
                    {jobs.length}× Jobs
                </span>
            );

        return (
            <>
                <div
                    className={[
                        "bg-card border rounded-lg p-3 cursor-pointer transition-colors duration-100",
                        expanded
                            ? "border-primary/40 bg-[rgba(200,168,75,0.05)] rounded-b-none border-b-transparent"
                            : "border-border active:bg-[rgba(200,168,75,0.06)]",
                    ].join(" ")}
                    onClick={() => onToggle(idx)}
                >
                    {/* Top row: name + margin */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                                <span className="font-medium text-[13px] leading-snug">{r.item_name}</span>
                                {r.amount_result > 1 && (
                                    <span className="text-[11px] text-muted-foreground">×{r.amount_result}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {jobBadge}
                                <span className="text-[10px] text-muted-foreground">Lv {r.level}</span>
                                <div className="flex items-center gap-1 ml-auto" onClick={(e) => e.stopPropagation()}>
                                    <a
                                        className="inline-flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                                        href={`https://universalis.app/market/${r.item_id}`}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        title="View on Universalis"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="13"
                                            height="13"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#5a9fe0"
                                            strokeWidth="2.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <line x1="18" y1="20" x2="18" y2="10" />
                                            <line x1="12" y1="20" x2="12" y2="4" />
                                            <line x1="6" y1="20" x2="6" y2="14" />
                                        </svg>
                                    </a>
                                    <a
                                        className="inline-flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                                        href={`https://garlandtools.org/db/#item/${r.item_id}`}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        title="View on Garland Tools"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="13"
                                            height="13"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#60b87a"
                                            strokeWidth="2.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                                        </svg>
                                    </a>
                                    <a
                                        className="inline-flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity"
                                        href={`https://ffxiv.consolegameswiki.com/wiki/${encodeURIComponent(r.item_name).replace(/%20/g, "_")}`}
                                        target="_blank"
                                        rel="noreferrer noopener"
                                        title="View on FF14 Wiki"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            width="13"
                                            height="13"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="#c8a84b"
                                            strokeWidth="2.2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 0 1-2 2z" />
                                            <path d="M19 3H6a2 2 0 0 0-2 2v12h14V5a2 2 0 0 0-1-1.73" />
                                            <path d="M8 21a2 2 0 0 1-2-2V5" />
                                            <line x1="11" y1="7" x2="17" y2="7" />
                                            <line x1="11" y1="11" x2="17" y2="11" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                        <span
                            className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 mt-0.5"
                            style={marginVariant}
                        >
                            {displayMargin}%
                        </span>
                    </div>

                    {/* Primary metrics */}
                    <div className="grid grid-cols-3 gap-x-3">
                        <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                                Craft Cost
                            </div>
                            <div className="font-mono text-[11px]">{gil(displayCost)}</div>
                            {excluded.size > 0 && (
                                <div className="font-mono text-[9px] text-muted-foreground line-through">
                                    {gil(r.cost)}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                                Sell Price
                            </div>
                            <div className="font-mono text-[11px]">{gil(r.sell_price)}</div>
                        </div>
                        <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                                Profit
                            </div>
                            <div className="font-mono text-[11px] font-semibold" style={{ color: profitColor }}>
                                {profitPos ? "+" : ""}
                                {gil(displayProfit)}
                            </div>
                            {excluded.size > 0 && (
                                <div className="font-mono text-[9px] text-muted-foreground line-through">
                                    {r.profit >= 0 ? "+" : ""}
                                    {gil(r.profit)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Secondary metrics */}
                    <div className="grid grid-cols-3 gap-x-3 mt-2 pt-2 border-t border-border/40">
                        <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                                Weekly Gil
                            </div>
                            <div className="font-mono text-[11px]">{gil(r.weekly_gil_earned)}</div>
                        </div>
                        <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                                Sales/Day
                            </div>
                            <div className="font-mono text-[11px]">
                                {(r.velocity ?? 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}
                            </div>
                        </div>
                        <div>
                            <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                                Last Sold
                            </div>
                            <div className="text-[11px] text-muted-foreground">{timeAgo(r.last_sold)}</div>
                        </div>
                    </div>

                    {/* Expand toggle */}
                    <div className="flex items-center justify-end mt-2 pt-1.5 border-t border-border/30 text-[10px] text-muted-foreground select-none">
                        {expanded ? "▲ hide ingredients" : "▼ show ingredients"}
                    </div>
                </div>

                {/* Ingredient panel — visually connected to card */}
                {expanded && (
                    <div
                        className="border border-primary/40 border-t-0 rounded-b-lg bg-[#080818] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <IngredientPanel
                            ingredients={r.ingredients}
                            excluded={excluded}
                            onToggle={toggleExclude}
                            onReset={resetExcluded}
                            compact
                            plannedQuantity={plannedQuantity}
                            onQuantityChange={setPlannedQuantity}
                            perCraftProfit={perCraftProfitForCalc}
                            sellPrice={r.sell_price}
                        />
                    </div>
                )}
            </>
        );
    }

    return (
        <>
            <tr
                className={[
                    "cursor-pointer transition-colors duration-100",
                    "hover:bg-[rgba(200,168,75,0.06)]",
                    expanded ? "bg-[rgba(200,168,75,0.05)]" : "",
                ].join(" ")}
                onClick={() => onToggle(idx)}
            >
                {/* Item */}
                <td className={tdCls}>
                    <div className="flex items-center">
                        <span className="font-medium">{r.item_name}</span>
                        {r.amount_result > 1 && (
                            <span className="text-[11px] text-muted-foreground ml-1">×{r.amount_result}</span>
                        )}
                        <a
                            className="inline-flex items-center justify-center ml-2 opacity-50 hover:opacity-100 transition-opacity"
                            href={`https://universalis.app/market/${r.item_id}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={(e) => e.stopPropagation()}
                            title="View on Universalis"
                        >
                            {/* Universalis bar-chart icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#5a9fe0"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                        </a>
                        <a
                            className="inline-flex items-center justify-center ml-1 opacity-50 hover:opacity-100 transition-opacity"
                            href={`https://garlandtools.org/db/#item/${r.item_id}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={(e) => e.stopPropagation()}
                            title="View on Garland Tools"
                        >
                            {/* Garland Tools book icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#60b87a"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                        </a>
                        <a
                            className="inline-flex items-center justify-center ml-1 opacity-50 hover:opacity-100 transition-opacity"
                            href={`https://ffxiv.consolegameswiki.com/wiki/${encodeURIComponent(r.item_name).replace(/%20/g, "_")}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            onClick={(e) => e.stopPropagation()}
                            title="View on FF14 Wiki"
                        >
                            {/* Wiki scroll icon */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="13"
                                height="13"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#c8a84b"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 0 1-2 2z" />
                                <path d="M19 3H6a2 2 0 0 0-2 2v12h14V5a2 2 0 0 0-1-1.73" />
                                <path d="M8 21a2 2 0 0 1-2-2V5" />
                                <line x1="11" y1="7" x2="17" y2="7" />
                                <line x1="11" y1="11" x2="17" y2="11" />
                            </svg>
                        </a>
                    </div>
                </td>

                {/* Job */}
                <td className={tdCls}>
                    {jobs.length === 1 ? (
                        // Single job — plain badge, no tooltip needed
                        (() => {
                            const jStyle = JOB_STYLES[jobs[0]] ?? { background: "rgba(30,30,30,0.9)", color: "#888" };
                            return (
                                <span className={JOB_BADGE_CLASS} style={jStyle}>
                                    {jobIcons[0] && <img src={jobIcons[0]} alt={jobs[0]} className={JOB_ICON_CLASS} />}
                                    {jobs[0]}
                                </span>
                            );
                        })()
                    ) : (
                        // Multiple jobs — combined badge with stacked icons + tooltip
                        <span
                            className="relative inline-flex"
                            ref={jobBadgeRef}
                            onMouseEnter={handleJobMouseEnter}
                            onMouseLeave={handleJobMouseLeave}
                        >
                            <span
                                className={`${JOB_BADGE_CLASS} gap-0.5 cursor-default`}
                                style={{ background: "rgba(30,30,46,0.9)", color: "#a0a0c0" }}
                            >
                                <span>{jobs.length}×</span>
                            </span>
                            <TooltipPortal
                                show={tipPos}
                                position={tooltipPos}
                                placement="centered"
                                above={above}
                                className="pointer-events-none bg-[#0d0d22] border border-border rounded shadow-lg px-2 py-1.5 flex flex-col gap-1 whitespace-nowrap"
                            >
                                <span className="text-[9px] uppercase tracking-widest text-muted-foreground mb-0.5">
                                    Craftable by
                                </span>
                                {jobs.map((job, i) => {
                                    const jStyle = JOB_STYLES[job] ?? {
                                        background: "rgba(30,30,30,0.9)",
                                        color: "#888",
                                    };
                                    return (
                                        <span key={job} className={JOB_BADGE_CLASS} style={jStyle}>
                                            {jobIcons[i] && (
                                                <img src={jobIcons[i]} alt={job} className={JOB_ICON_CLASS} />
                                            )}
                                            {job}
                                        </span>
                                    );
                                })}
                            </TooltipPortal>
                        </span>
                    )}
                </td>

                {/* Level */}
                <td className={tdCls}>
                    <span className="text-[12px] text-muted-foreground">{r.level}</span>
                </td>

                {/* Craft Cost */}
                <td className={tdCls}>
                    <span className="font-mono text-[12px] text-foreground">{gil(displayCost)}</span>
                    {excluded.size > 0 && (
                        <span className="block font-mono text-[10px] text-muted-foreground line-through">
                            {gil(r.cost)}
                        </span>
                    )}
                </td>

                {/* Sell Price */}
                <td className={tdCls}>
                    <span className="font-mono text-[12px] text-foreground">{gil(r.sell_price)}</span>
                </td>

                {/* Profit */}
                <td className={tdCls}>
                    <span className="font-mono text-[12px] font-semibold" style={{ color: profitColor }}>
                        {profitPos ? "+" : ""}
                        {gil(displayProfit)}
                    </span>
                    {excluded.size > 0 && (
                        <span className="block font-mono text-[10px] text-muted-foreground line-through">
                            {r.profit >= 0 ? "+" : ""}
                            {gil(r.profit)}
                        </span>
                    )}
                </td>

                {/* Margin */}
                <td className={tdCls}>
                    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold" style={marginVariant}>
                        {displayMargin}%
                    </span>
                </td>

                {/* Weekly Gil Earned */}
                <td className={tdCls}>
                    <span className="font-mono text-[12px] text-foreground">{gil(r.weekly_gil_earned)}</span>
                </td>

                {/* Purchases */}
                <td className={tdCls}>
                    <span className="text-[12px] text-[#5a9fe0]">
                        {(r.weekly_purchases ?? 0).toLocaleString("en-US")}
                    </span>
                </td>

                {/* Sales/Day */}
                <td className={tdCls}>
                    <span className="text-[12px] text-[#5a9fe0]">
                        {(r.velocity ?? 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}
                    </span>
                </td>

                {/* Qty Sold */}
                <td className={tdCls}>
                    <span className="text-[12px] text-[#5a9fe0]">
                        {(r.weekly_qty_sold ?? 0).toLocaleString("en-US")}
                    </span>
                </td>

                {/* Last Sold */}
                <td className={tdCls}>
                    <span className="text-[12px] text-muted-foreground">{timeAgo(r.last_sold)}</span>
                </td>

                {/* Listings */}
                <td className={tdCls}>
                    <span className="text-[12px] text-muted-foreground">{r.listing_count ?? 0}</span>
                </td>
            </tr>

            {expanded && (
                <tr>
                    <td
                        colSpan={13}
                        className="bg-[#080818] p-0 border-b border-border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <IngredientPanel
                            ingredients={r.ingredients}
                            excluded={excluded}
                            onToggle={toggleExclude}
                            onReset={resetExcluded}
                            plannedQuantity={plannedQuantity}
                            onQuantityChange={setPlannedQuantity}
                            perCraftProfit={perCraftProfitForCalc}
                            sellPrice={r.sell_price}
                        />
                    </td>
                </tr>
            )}
        </>
    );
}
