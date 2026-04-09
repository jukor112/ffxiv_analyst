import { TABLE_COLS } from "../utils/format";
import ResultRow from "./ResultRow";

export default function ResultsTable({ results, sortField, sortAsc, expandedIds, onSort, onToggle }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        {TABLE_COLS.map((col) => {
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
                    {results.map((r, idx) => (
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
    );
}
