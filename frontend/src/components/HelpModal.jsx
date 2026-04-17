import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const CRAFTING_COLS = [
    { name: "Item", desc: "The crafted item's name. Click any row to expand and see its ingredients." },
    { name: "Job", desc: "The crafter job(s) that can make this item." },
    { name: "Lvl", desc: "Required recipe level." },
    { name: "Craft Cost", desc: "Total marketboard cost of all ingredients needed to craft one batch." },
    { name: "Avg Sold Price", desc: "Average price the item sold for on the marketboard recently." },
    { name: "Profit", desc: "Avg Sold Price minus Craft Cost. Positive is profitable." },
    { name: "Margin", desc: "Profit as a percentage of the sell price. Higher is better." },
    { name: "Weekly Gil", desc: "Estimated weekly revenue: Avg Sold Price × qty sold in the last 7 days." },
    { name: "Purchases", desc: "Number of purchase transactions in the last 7 days." },
    { name: "Sales/Day", desc: "Average number of units sold per day over the stat window." },
    { name: "Qty Sold", desc: "Total units sold across all transactions in the stat window." },
    { name: "Last Sold", desc: "How long ago the most recent sale occurred." },
    { name: "Listings", desc: "Active listing count on the marketboard right now." },
];

const SCAN_COLS = [
    { name: "Item", desc: "A non-craftable item obtainable from a shop or as a drop." },
    { name: "Category", desc: "Item UI category (e.g. Minion, Triple Triad Card, Housing)." },
    { name: "Source", desc: "SHOP = purchasable from an NPC for a fixed price. DROP = world/dungeon drop." },
    { name: "Min Price", desc: "Lowest active listing price on the marketboard." },
    { name: "Sales/Day", desc: "Average units sold per day." },
    { name: "Weekly Gil", desc: "Estimated weekly revenue at the current price." },
    { name: "Qty Sold", desc: "Units sold within the stat window." },
    { name: "Last Sold", desc: "How long ago the most recent sale occurred." },
    { name: "Listings", desc: "Active listing count on the marketboard right now." },
];

const TIPS = [
    {
        heading: "Stat Window (Sale Period)",
        body: "Controls how far back sale history is counted. 7 days captures fresh demand. Set to 0 (Any) to include all historical data — useful for slow-moving but high-value items like furniture.",
    },
    {
        heading: "Ingredient cost exclusion",
        body: "Expand a crafting row and click any ingredient to exclude its cost. This is useful when you already have a material on hand or can gather/craft it yourself — the profit recalculates live.",
    },
    {
        heading: "Min Sales/Day",
        body: "Filters out items that rarely sell. Set it high (5+) for fast commodities; set it low (0.1) to surface rare high-value items.",
    },
    {
        heading: "Market Scan mode",
        body: "Shows items you can't craft but can flip or farm — shop items you can buy and resell, or drop items worth hunting. Great for finding gil without levelling crafters.",
    },
    {
        heading: "Data source",
        body: "All market data comes from Universalis, a community-maintained marketboard API. Prices update in real time as players report sales.",
    },
];

export default function HelpModal({ onClose }) {
    const backdropRef = useRef(null);

    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <>
            {/* Backdrop */}
            <div ref={backdropRef} className="fixed inset-0 bg-black/60 z-[9999]" onClick={onClose} />

            {/* Panel */}
            <div className="fixed z-[10000] top-4 bottom-4 left-3 right-3 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[560px] sm:max-h-[90vh] flex flex-col rounded-lg border border-border bg-card shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                    <span className="font-semibold text-sm text-foreground">How to use Marketboard Analyst</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 rounded hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-4 py-4 space-y-6 text-sm">
                    {/* Modes */}
                    <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Modes</h2>
                        <div className="space-y-2">
                            <div className="rounded-md bg-muted/40 border border-border px-3 py-2.5">
                                <p className="font-semibold text-foreground text-[13px] mb-0.5">Crafting</p>
                                <p className="text-muted-foreground text-[12px]">
                                    Fetches live ingredient prices and calculates the profit margin for every craftable
                                    recipe matching your filters. Use this to find the most profitable things to make.
                                </p>
                            </div>
                            <div className="rounded-md bg-muted/40 border border-border px-3 py-2.5">
                                <p className="font-semibold text-foreground text-[13px] mb-0.5">Drops &amp; Shop</p>
                                <p className="text-muted-foreground text-[12px]">
                                    Scans the marketboard for items obtainable from NPC shops or as drops — things you
                                    can buy cheap and resell, or farm and list. No crafting required.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Tips */}
                    <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Tips</h2>
                        <div className="space-y-2">
                            {TIPS.map((tip) => (
                                <div
                                    key={tip.heading}
                                    className="rounded-md bg-muted/40 border border-border px-3 py-2.5"
                                >
                                    <p className="font-semibold text-foreground text-[13px] mb-0.5">{tip.heading}</p>
                                    <p className="text-muted-foreground text-[12px]">{tip.body}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Crafting columns */}
                    <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                            Crafting — Column Reference
                        </h2>
                        <div className="rounded-md border border-border overflow-hidden">
                            <table className="w-full text-[12px]">
                                <tbody>
                                    {CRAFTING_COLS.map((col, i) => (
                                        <tr key={col.name} className={i % 2 === 0 ? "bg-muted/20" : "bg-transparent"}>
                                            <td className="px-3 py-2 font-mono font-semibold text-primary whitespace-nowrap align-top w-[120px]">
                                                {col.name}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">{col.desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Scan columns */}
                    <section>
                        <h2 className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">
                            Drops &amp; Shop — Column Reference
                        </h2>
                        <div className="rounded-md border border-border overflow-hidden">
                            <table className="w-full text-[12px]">
                                <tbody>
                                    {SCAN_COLS.map((col, i) => (
                                        <tr key={col.name} className={i % 2 === 0 ? "bg-muted/20" : "bg-transparent"}>
                                            <td className="px-3 py-2 font-mono font-semibold text-primary whitespace-nowrap align-top w-[120px]">
                                                {col.name}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">{col.desc}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
