import { TABLE_COLS, SCAN_TABLE_COLS } from "../utils/format";
import ResultRow from "./ResultRow";
import MarketScanRow from "./MarketScanRow";

const MOBILE_CRAFT_SORT_KEYS = ["profit", "margin", "weekly_gil_earned", "cost", "velocity", "sell_price"];
const MOBILE_SCAN_SORT_KEYS = ["weekly_gil_earned", "sell_price", "velocity", "weekly_qty_sold", "last_sold"];

export default function ResultsTable({
    results,
    sortField,
    sortAsc,
    expandedIds,
    onSort,
    onToggle,
    mode = "crafting",
}) {
    const cols = mode === "scan" ? SCAN_TABLE_COLS : TABLE_COLS;
    const mobileSortCols = cols.filter((c) =>
        (mode === "scan" ? MOBILE_SCAN_SORT_KEYS : MOBILE_CRAFT_SORT_KEYS).includes(c.key),
    );

    return (
        <>
            {/* Desktop: traditional table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            {cols.map((col) => {
                                const active = col.key === sortField;
                                return (
                                    <th
                                        key={col.key}
                                        onClick={() => onSort(col.key)}
                                        className={[
                                            "bg-[#0b0b20] px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.9px] whitespace-nowrap",
                                            "cursor-pointer select-none border-b border-border transition-colors duration-150",
                                            active ? "text-foreground" : "text-primary hover:text-foreground",
                                        ].join(" ")}
                                    >
                                        {col.label}
                                        {active && (
                                            <span className="inline-block ml-1 text-[8px] opacity-80">
                                                {sortAsc ? "▲" : "▼"}
                                            </span>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {mode === "scan"
                            ? results.map((r, idx) => <MarketScanRow key={r.item_id} r={r} idx={idx} />)
                            : results.map((r, idx) => (
                                  <ResultRow
                                      key={r.recipe_id}
                                      r={r}
                                      idx={idx}
                                      expanded={expandedIds.has(idx)}
                                      onToggle={onToggle}
                                  />
                              ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile: sort strip + card list */}
            <div className="md:hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-[#0b0b20]">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground shrink-0">Sort</span>
                    <div className="flex gap-1 overflow-x-auto">
                        {mobileSortCols.map((col) => {
                            const active = col.key === sortField;
                            return (
                                <button
                                    key={col.key}
                                    type="button"
                                    onClick={() => onSort(col.key)}
                                    className={[
                                        "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap shrink-0 transition-colors duration-150",
                                        active
                                            ? "bg-primary/20 text-primary"
                                            : "text-muted-foreground hover:text-foreground",
                                    ].join(" ")}
                                >
                                    {col.label}
                                    {active && <span className="ml-0.5">{sortAsc ? "▲" : "▼"}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="flex flex-col gap-2 p-2">
                    {mode === "scan"
                        ? results.map((r, idx) => <MarketScanRow key={r.item_id} r={r} idx={idx} asCard />)
                        : results.map((r, idx) => (
                              <ResultRow
                                  key={r.recipe_id}
                                  r={r}
                                  idx={idx}
                                  expanded={expandedIds.has(idx)}
                                  onToggle={onToggle}
                                  asCard
                              />
                          ))}
                </div>
            </div>
        </>
    );
}
