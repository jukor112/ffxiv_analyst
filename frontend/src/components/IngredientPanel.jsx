import { gil } from "../utils/format";

const SOURCE_BADGE = {
    craft: { label: "Craft", title: "Can be crafted — price shown is from the marketboard", style: { background: "rgba(80,120,200,0.18)", color: "#6aa0e8" } },
    gather: { label: "Gather", title: "Can be gathered — price shown is from the marketboard", style: { background: "rgba(60,180,100,0.18)", color: "#4cba82" } },
    buy: { label: "Market", title: "Price from the marketboard", style: { background: "rgba(140,140,140,0.15)", color: "#888" } },
    npc: { label: "NPC", title: "Fixed price from an NPC shop", style: { background: "rgba(220,160,40,0.18)", color: "#d4a435" } },
};

export default function IngredientPanel({ ingredients, excluded, onToggle, onReset }) {
    const totalCost = ingredients.reduce((sum, ing) => sum + ing.total, 0);
    const adjustedCost = ingredients.reduce((sum, ing, i) => sum + (excluded.has(i) ? 0 : ing.total), 0);
    const saving = totalCost - adjustedCost;

    return (
        <div className="px-4 py-3 pl-9">
            <div className="flex items-center gap-3 mb-1">
                <p className="text-[10px] uppercase tracking-[1px] text-primary font-bold">Ingredients</p>
                <p className="text-[10px] text-muted-foreground">
                    click an ingredient to exclude its cost (you craft/gather it yourself)
                </p>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2.5">
                Prices shown are marketboard prices unless noted otherwise ·{" "}
                <span className="font-semibold" style={{ color: "#d4a435" }}>NPC</span> = fixed NPC shop price ·{" "}
                <span className="font-semibold" style={{ color: "#6aa0e8" }}>Craft</span> /{" "}
                <span className="font-semibold" style={{ color: "#4cba82" }}>Gather</span> = crafted/gathered but priced via marketboard
            </p>
            <div className="flex flex-wrap gap-2">
                {ingredients.map((ing, i) => {
                    const badge = SOURCE_BADGE[ing.source] ?? SOURCE_BADGE.buy;
                    const isExcluded = excluded.has(i);
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onToggle(i)}
                            className={[
                                "rounded-md border px-3 py-2 text-[12px] text-left transition-all duration-150 cursor-pointer",
                                isExcluded
                                    ? "border-border bg-card opacity-40 line-through"
                                    : "border-border bg-card hover:border-primary",
                            ].join(" ")}
                            title={isExcluded ? "Click to include in cost" : "Click to exclude from cost"}
                        >
                            <div className="flex items-center gap-1.5 mb-0.5">
                                <p className="text-foreground font-medium">{ing.name}</p>
                                <span
                                    className="inline-block px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wide leading-tight"
                                    style={badge.style}
                                    title={badge.title}
                                >
                                    {badge.label}
                                </span>
                                {isExcluded && (
                                    <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wide">
                                        excluded
                                    </span>
                                )}
                            </div>
                            <p className="text-muted-foreground font-mono text-[11px]">
                                {ing.amount} × {gil(ing.unit_price)} = {gil(ing.total)}
                            </p>
                        </button>
                    );
                })}
            </div>
            {excluded.size > 0 && (
                <div className="mt-3 flex items-center gap-3 text-[11px]">
                    <span className="text-muted-foreground">
                        Adjusted craft cost:{" "}
                        <span className="font-mono font-semibold text-foreground">{gil(adjustedCost)}</span>
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-[#4cba82]">
                        saving <span className="font-mono font-semibold">{gil(saving)}</span>
                    </span>
                    <button
                        type="button"
                        className="ml-1 text-muted-foreground hover:text-primary transition-colors text-[10px] underline cursor-pointer"
                        onClick={() => onReset()}
                    >
                        reset
                    </button>
                </div>
            )}
        </div>
    );
}
