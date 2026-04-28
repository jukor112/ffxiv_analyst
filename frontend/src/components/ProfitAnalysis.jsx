import { useState, useRef } from "react";
import useTooltipPosition from "../hooks/useTooltipPosition";
import TooltipPortal from "./TooltipPortal";
import { gil } from "../utils/format";

// Margin explanation content
const MARGIN_EXPLANATION = {
    title: "What is Margin?",
    definition:
        "Margin represents the profitability of a craft as a percentage of the sell price. It shows how much of every gil earned is pure profit.",
    formula: "Margin = (Profit ÷ Sell Price) × 100",
    tiers: [
        {
            label: "High Margin",
            threshold: "≥ 50%",
            description: "Excellent return — more than half the sell price is profit.",
        },
        {
            label: "Medium Margin",
            threshold: "20–49%",
            description: "Solid return — a healthy portion of revenue is profit.",
        },
        { label: "Low Margin", threshold: "< 20%", description: "Thin return — most revenue goes back into costs." },
    ],
    note: "A 100% margin means you sell for free (profit equals full cost). Negative margin means the craft operates at a loss.",
};

export default function ProfitAnalysis({
    ingredients,
    excluded,
    perCraftProfit,
    sellPrice = 0,
    plannedQuantity = 1,
    onQuantityChange,
    compact = false,
}) {
    const [profitCollapsed, setProfitCollapsed] = useState(true);
    const helpBtnRef = useRef(null);

    const {
        tooltipPos,
        show: showMarginHelp,
        handleShow: handleShowMargin,
        handleHide: handleHideMargin,
    } = useTooltipPosition({
        placement: "bottom-right",
        offset: 8,
        maxWidth: 272,
        maxHeight: 400,
    });

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.total, 0);
    const adjustedCost = ingredients.reduce((sum, ing, i) => sum + (excluded.has(i) ? 0 : ing.total), 0);
    const saving = totalCost - adjustedCost;

    const totalProfit = perCraftProfit * plannedQuantity;
    const totalProfitPos = totalProfit >= 0;
    const showCalculator = plannedQuantity > 1;

    function handleQuantityChange(e) {
        if (!onQuantityChange) return;
        const val = parseInt(e.target.value, 10);
        onQuantityChange(isNaN(val) || val < 1 ? 1 : val);
    }

    const margin = sellPrice > 0 ? Math.round((perCraftProfit / sellPrice) * 1000) / 10 : 0;
    const marginVariant =
        margin >= 50
            ? {
                  background: "rgba(76,186,130,0.12)",
                  color: "#4cba82",
                  border: "rgba(76,186,130,0.3)",
              }
            : margin >= 20
              ? {
                    background: "rgba(200,168,75,0.12)",
                    color: "#c8a84b",
                    border: "rgba(200,168,75,0.3)",
                }
              : {
                    background: "rgba(224,80,80,0.12)",
                    color: "#e05050",
                    border: "rgba(224,80,80,0.3)",
                };

    return (
        <div className="mt-3 pt-3 border-t border-border/40">
            <button
                type="button"
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setProfitCollapsed(!profitCollapsed)}
                aria-expanded={!profitCollapsed}
            >
                <span
                    className="text-[9px] text-muted-foreground transition-transform duration-200 group-hover:text-primary select-none"
                    style={{ transform: profitCollapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
                >
                    ▼
                </span>
                <p className="text-[10px] uppercase tracking-[1.5px] text-primary font-bold mb-0 group-hover:text-primary/80 transition-colors">
                    Profit Analysis
                </p>
            </button>

            {!profitCollapsed && (
                <div className="mt-3 space-y-4">
                    {/* Per-craft breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1.5 font-semibold">
                                Per Craft
                            </p>
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">Sell Price</span>
                                    <span className="font-mono text-[12px] text-foreground">{gil(sellPrice)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-muted-foreground">Cost</span>
                                    <span className="font-mono text-[12px] text-foreground">{gil(adjustedCost)}</span>
                                    {excluded.size > 0 && (
                                        <span className="font-mono text-[9px] text-muted-foreground line-through ml-1">
                                            ({gil(totalCost)})
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between pt-1.5 border-t border-border/30">
                                    <span className="text-[10px] text-muted-foreground font-medium">Profit</span>
                                    <span
                                        className="font-mono text-[12px] font-semibold"
                                        style={{ color: totalProfitPos ? "#4cba82" : "#e05050" }}
                                    >
                                        {totalProfitPos ? "+" : "−"}
                                        {gil(Math.abs(perCraftProfit))}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Margin badge */}
                        <div className="flex flex-col justify-between h-full">
                            <div className="flex items-center gap-1.5">
                                <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">
                                    Margin
                                </p>
                                <button
                                    ref={helpBtnRef}
                                    type="button"
                                    className="relative inline-flex items-center justify-center w-4 h-4 rounded-full border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors select-none"
                                    onClick={() => handleShowMargin(helpBtnRef.current)}
                                    onMouseEnter={() => handleShowMargin(helpBtnRef.current)}
                                    onTouchStart={(e) => {
                                        e.preventDefault();
                                        handleShowMargin(helpBtnRef.current);
                                    }}
                                    onMouseLeave={handleHideMargin}
                                    aria-label="What is margin?"
                                    title="What is margin?"
                                >
                                    <span className="text-[9px] font-bold leading-none">?</span>
                                    <TooltipPortal
                                        show={showMarginHelp}
                                        position={tooltipPos}
                                        placement="bottom-right"
                                        maxWidth={272}
                                        maxHeight={400}
                                        onClose={() => handleHideMargin()}
                                        className="w-64 bg-popover border border-border/60 rounded-lg shadow-lg p-3 text-left"
                                    >
                                        <h4 className="text-[11px] font-bold text-primary mb-2">
                                            {MARGIN_EXPLANATION.title}
                                        </h4>
                                        <p className="text-[10px] text-foreground leading-relaxed mb-2">
                                            {MARGIN_EXPLANATION.definition}
                                        </p>
                                        <div className="bg-card/60 rounded-md px-2 py-1.5 mb-2 border border-border/30">
                                            <code className="text-[10px] font-mono text-primary">
                                                {MARGIN_EXPLANATION.formula}
                                            </code>
                                        </div>

                                        {/* Margin Tiers - visible only on mobile where inline descriptions are hidden */}
                                        <div className="space-y-1.5 mb-2 sm:hidden">
                                            <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">
                                                Margin Tiers
                                            </p>
                                            {MARGIN_EXPLANATION.tiers.map((tier) => {
                                                const colors = {
                                                    "High Margin": "#4cba82",
                                                    "Medium Margin": "#c8a84b",
                                                    "Low Margin": "#e05050",
                                                };
                                                return (
                                                    <div
                                                        key={tier.label}
                                                        className="items-center gap-2 py-1 border-b border-border/20 last:border-b-0"
                                                    >
                                                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                                                            <span
                                                                className="w-2 h-2 rounded-full flex"
                                                                style={{ background: colors[tier.label] }}
                                                            />
                                                            <span className="text-[10px] font-semibold text-foreground">
                                                                {tier.label}
                                                                <span className="font-normal text-muted-foreground">
                                                                    {tier.threshold}
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <span className="text-[9px] text-muted-foreground text-right flex-shrink-0">
                                                            {tier.description}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <p className="text-[9px] text-muted-foreground italic border-t border-border/30 pt-2 mt-1">
                                            {MARGIN_EXPLANATION.note}
                                        </p>
                                    </TooltipPortal>
                                </button>
                            </div>

                            {/* Margin badge with stacked tier legend */}
                            <div className="flex flex-col sm:flex-row items-center gap-1.5 py-1">
                                <div className="flex flex-grow justify-center">
                                    <span
                                        className="inline-block px-3 py-1.5 rounded-lg text-[14px] font-bold border"
                                        style={marginVariant}
                                    >
                                        {margin}%
                                    </span>
                                </div>

                                {/* Stacked tier indicators with descriptions */}
                                <div className="flex flex-col gap-0.5 w-full w-auto flex-[5]">
                                    {MARGIN_EXPLANATION.tiers.map((tier) => {
                                        const colors = {
                                            "High Margin": { dot: "#4cba82", text: "#4cba82" },
                                            "Medium Margin": { dot: "#c8a84b", text: "#c8a84b" },
                                            "Low Margin": { dot: "#e05050", text: "#e05050" },
                                        };
                                        const active =
                                            (tier.label === "High Margin" && margin >= 50) ||
                                            (tier.label === "Medium Margin" && margin >= 20 && margin < 50) ||
                                            (tier.label === "Low Margin" && margin < 20);
                                        return (
                                            <span
                                                key={tier.label}
                                                className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-[12px] font-medium transition-all"
                                                style={{
                                                    color: active
                                                        ? colors[tier.label].text
                                                        : "var(--muted-foreground, #888)",
                                                    opacity: active ? 1 : 0.45,
                                                    background: active
                                                        ? active
                                                            ? colors[tier.label].dot + "18"
                                                            : undefined
                                                        : undefined,
                                                }}
                                                title={tier.description}
                                            >
                                                <span
                                                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                                                    style={{ background: colors[tier.label].dot }}
                                                />
                                                <span className="font-semibold">{tier.threshold}</span>
                                                <span className="text-[11px] opacity-80 hidden sm:inline">
                                                    {tier.description}
                                                </span>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quantity input + totals */}
                    <div className="pt-3 border-t border-border/40">
                        <div className="flex items-center gap-2 mb-3">
                            <label
                                htmlFor={`planned-crafts-${compact ? "card" : "table"}`}
                                className="text-muted-foreground text-[10px] uppercase tracking-wide whitespace-nowrap font-medium"
                            >
                                Planned Crafts:
                            </label>
                            <input
                                id={`planned-crafts-${compact ? "card" : "table"}`}
                                type="number"
                                min={1}
                                step={1}
                                value={plannedQuantity}
                                onChange={handleQuantityChange}
                                className="w-20 border border-border bg-card rounded-md px-2.5 py-1.5 text-[13px] font-mono text-center focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all"
                                aria-label="Number of planned crafts"
                            />
                            <span className="text-muted-foreground text-[10px]">craft(s)</span>
                        </div>

                        {/* Total breakdown */}
                        {showCalculator && (
                            <div className="bg-card/50 rounded-lg border border-border/30 p-3 space-y-2">
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-muted-foreground">Total Revenue</span>
                                    <span className="font-mono text-foreground">
                                        {gil(sellPrice * plannedQuantity)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-muted-foreground">Total Cost</span>
                                    <span className="font-mono text-foreground">
                                        {gil(adjustedCost * plannedQuantity)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-[13px] font-semibold pt-2 border-t border-border/30">
                                    <span style={{ color: totalProfitPos ? "#4cba82" : "#e05050" }}>Total Profit</span>
                                    <span style={{ color: totalProfitPos ? "#4cba82" : "#e05050" }}>
                                        {totalProfitPos ? "+" : "−"}
                                        {gil(Math.abs(totalProfit))}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
