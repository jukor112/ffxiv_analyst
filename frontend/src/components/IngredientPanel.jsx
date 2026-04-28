import { gil } from "../utils/format";
import ProfitAnalysis from "./ProfitAnalysis";

const SOURCE_BADGE = {
    craft: {
        label: "Craft",
        title: "Can be crafted — price shown is from the marketboard",
        style: { background: "rgba(106,160,232,0.2)", color: "#6aa0e8" },
    },
    gather: {
        label: "Gather",
        title: "Can be gathered — price shown is from the marketboard",
        style: { background: "rgba(76,186,130,0.2)", color: "#4cba82" },
    },
    buy: {
        label: "Market",
        title: "Price from the marketboard",
        style: { background: "rgba(140,140,140,0.15)", color: "#888" },
    },
    npc: {
        label: "NPC",
        title: "Fixed price from an NPC shop",
        style: { background: "rgba(220,160,40,0.2)", color: "#d4a435" },
    },
};

const SOURCE_DOT = {
    craft: "#6aa0e8",
    gather: "#4cba82",
    buy: "#888",
    npc: "#d4a435",
};

export default function IngredientPanel({
    ingredients,
    excluded,
    onToggle,
    onReset,
    compact = false,
    perCraftProfit = 0,
    sellPrice = 0,
    plannedQuantity = 1,
    onQuantityChange,
}) {
    const totalCost = ingredients.reduce((sum, ing) => sum + ing.total, 0);
    const adjustedCost = ingredients.reduce((sum, ing, i) => sum + (excluded.has(i) ? 0 : ing.total), 0);
    const saving = totalCost - adjustedCost;

    return (
        <div className={compact ? "px-4 py-3" : "px-6 py-4"}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <p className="text-[11px] uppercase tracking-[1.5px] text-primary font-bold m-0">Ingredients</p>
                    {!compact && (
                        <p className="text-[10px] text-muted-foreground m-0 hidden sm:block">
                            click an ingredient to exclude its cost (you craft/gather it yourself)
                        </p>
                    )}
                </div>
                {excluded.size > 0 && (
                    <button
                        type="button"
                        className="text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-wide cursor-pointer"
                        onClick={() => onReset()}
                    >
                        reset exclusions
                    </button>
                )}
            </div>

            {/* Legend */}
            {!compact && (
                <div className="flex items-center gap-3 flex-wrap mb-3 text-[10px] text-muted-foreground">
                    {Object.entries(SOURCE_BADGE).map(([key, badge]) => (
                        <span key={key} className="inline-flex items-center gap-1.5" title={badge.title}>
                            <span
                                className="inline-block w-2 h-2 rounded-full"
                                style={{ backgroundColor: SOURCE_DOT[key] }}
                            />
                            <span style={{ [key === "buy" ? "" : "color"]: badge.style.color }}>{badge.label}</span>
                        </span>
                    ))}
                </div>
            )}

            {/* Ingredient Table (Desktop) / Grid (Mobile) */}
            <div className="hidden md:block">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border/50">
                            <th className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold py-1.5 pr-3 text-left">
                                Ingredient
                            </th>
                            <th className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold py-1.5 pr-3 text-right w-24">
                                Unit Price
                            </th>
                            <th className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold py-1.5 pr-3 text-right w-20">
                                Qty
                            </th>
                            <th className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold py-1.5 pr-3 text-right w-28">
                                Total
                            </th>
                            <th className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold py-1.5 text-right w-20">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {ingredients.map((ing, i) => {
                            const badge = SOURCE_BADGE[ing.source] ?? SOURCE_BADGE.buy;
                            const isExcluded = excluded.has(i);
                            return (
                                <tr
                                    key={i}
                                    onClick={() => onToggle(i)}
                                    className={[
                                        "cursor-pointer transition-all duration-150",
                                        isExcluded
                                            ? "bg-card/50 opacity-50"
                                            : "hover:bg-[rgba(200,168,75,0.04)] active:bg-[rgba(200,168,75,0.08)]",
                                    ].join(" ")}
                                    title={isExcluded ? "Click to include in cost" : "Click to exclude from cost"}
                                >
                                    <td className="py-2 pr-3">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="inline-block w-1.5 h-4 rounded-full shrink-0"
                                                style={{ backgroundColor: SOURCE_DOT[ing.source] }}
                                            />
                                            <span
                                                className={[
                                                    "text-[13px] font-medium text-foreground",
                                                    isExcluded ? "line-through" : "",
                                                ].join(" ")}
                                            >
                                                {ing.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                        <span className="font-mono text-[11px] text-muted-foreground">
                                            {gil(ing.unit_price)}
                                        </span>
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                        <span className="font-mono text-[11px] text-foreground">×{ing.amount}</span>
                                    </td>
                                    <td className="py-2 pr-3 text-right">
                                        <span
                                            className={[
                                                "font-mono text-[12px] font-semibold",
                                                isExcluded ? "text-muted-foreground" : "text-foreground",
                                            ].join(" ")}
                                        >
                                            {gil(ing.total)}
                                        </span>
                                    </td>
                                    <td className="py-2 text-right">
                                        {isExcluded ? (
                                            <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400">
                                                self
                                            </span>
                                        ) : (
                                            <span
                                                className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                                                style={badge.style}
                                            >
                                                {badge.label}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Ingredient Grid (Mobile) */}
            <div className="md:hidden flex flex-wrap gap-2">
                {ingredients.map((ing, i) => {
                    const badge = SOURCE_BADGE[ing.source] ?? SOURCE_BADGE.buy;
                    const isExcluded = excluded.has(i);
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onToggle(i)}
                            className={[
                                "flex-1 min-w-[45%] rounded-lg border px-3 py-2 text-[12px] text-left transition-all duration-150 cursor-pointer",
                                isExcluded
                                    ? "border-border/50 bg-card/60 opacity-50 line-through"
                                    : "border-border bg-card hover:border-primary/50",
                            ].join(" ")}
                            title={isExcluded ? "Click to include in cost" : "Click to exclude from cost"}
                        >
                            <div className="flex items-center gap-1.5 mb-1">
                                <span
                                    className="inline-block w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: SOURCE_DOT[ing.source] }}
                                />
                                <p className="text-foreground font-medium truncate">{ing.name}</p>
                            </div>
                            <p className="text-muted-foreground font-mono text-[10px]">
                                {gil(ing.unit_price)} × {ing.amount} = {gil(ing.total)}
                            </p>
                            {isExcluded && (
                                <span className="text-[9px] text-red-400 font-bold uppercase mt-0.5 block">
                                    self-crafted
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Exclusion summary */}
            {excluded.size > 0 && (
                <div className="mt-3 pt-3 border-t border-border/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <span className="text-muted-foreground">
                        Adjusted cost:{" "}
                        <span className="font-mono font-semibold text-foreground">{gil(adjustedCost)}</span>
                        {excluded.size > 0 && (
                            <span className="text-muted-foreground line-through ml-1">({gil(totalCost)})</span>
                        )}
                    </span>
                    <span className="text-[#4cba82] font-medium">↓ saving {gil(saving)}</span>
                </div>
            )}

            {/* Profit Analysis */}
            <ProfitAnalysis
                ingredients={ingredients}
                excluded={excluded}
                perCraftProfit={perCraftProfit}
                sellPrice={sellPrice}
                plannedQuantity={plannedQuantity}
                onQuantityChange={onQuantityChange}
                compact={compact}
            />
        </div>
    );
}
