import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * FFXIV item category tree — mirrors Universalis / XIVAPI ItemUICategory names.
 * Each group has a label and array of [displayName, categorySubstring] tuples.
 * categorySubstring is matched case-insensitively against the item's ItemUICategory.
 */
export const CATEGORY_GROUPS = [
    {
        group: "Arms",
        items: [
            ["Archanist's Arms", "Arcanist"],
            ["Archer's Arms", "Archer"],
            ["Astrologian's Arms", "Astrologian"],
            ["Blue Mage's Arms", "Blue Mage"],
            ["Conjurer's Arms", "Conjurer"],
            ["Dancer's Arms", "Dancer"],
            ["Dark Knight's Arms", "Dark Knight"],
            ["Gladiator's Arms", "Gladiator"],
            ["Gunbreaker's Arms", "Gunbreaker"],
            ["Lancer's Arms", "Lancer"],
            ["Machinist's Arms", "Machinist"],
            ["Marauder's Arms", "Marauder"],
            ["Pictomancer's Arms", "Pictomancer"],
            ["Pugilist's Arms", "Pugilist"],
            ["Reaper's Arms", "Reaper"],
            ["Red Mage's Arms", "Red Mage"],
            ["Rogue's Arms", "Rogue"],
            ["Sage's Arms", "Sage"],
            ["Samurai's Arms", "Samurai"],
            ["Scholar's Arms", "Scholar"],
            ["Thaumaturge's Arms", "Thaumaturge"],
            ["Viper's Arms", "Viper"],
        ],
    },
    {
        group: "Tools",
        items: [
            ["Alchemist's Tools", "Alchemist"],
            ["Armorer's Tools", "Armorer"],
            ["Blacksmith's Tools", "Blacksmith"],
            ["Botanist's Tools", "Botanist"],
            ["Carpenter's Tools", "Carpenter"],
            ["Culinarian's Tools", "Culinarian"],
            ["Fisher's Tackle", "Fisher's Tackle"],
            ["Fisher's Tools", "Fisher's Tools"],
            ["Goldsmith's Tools", "Goldsmith"],
            ["Leatherworker's Tools", "Leatherworker"],
            ["Miner's Tools", "Miner"],
            ["Weaver's Tools", "Weaver"],
        ],
    },
    {
        group: "Armor",
        items: [
            ["Shields", "Shield"],
            ["Head", "Head"],
            ["Body", "Body"],
            ["Legs", "Legs"],
            ["Hands", "Hands"],
            ["Feet", "Feet"],
        ],
    },
    {
        group: "Accessories",
        items: [
            ["Necklaces", "Necklace"],
            ["Earrings", "Earring"],
            ["Bracelets", "Bracelet"],
            ["Rings", "Ring"],
        ],
    },
    {
        group: "Medicines & Meals",
        items: [
            ["Medicine", "Medicine"],
            ["Ingredients", "Ingredient"],
            ["Meals", "Meal"],
            ["Seafood", "Seafood"],
        ],
    },
    {
        group: "Materials",
        items: [
            ["Stone", "Stone"],
            ["Metal", "Metal"],
            ["Lumber", "Lumber"],
            ["Cloth", "Cloth"],
            ["Leather", "Leather"],
            ["Bone", "Bone"],
            ["Reagents", "Reagent"],
            ["Dyes", "Dye"],
            ["Weapon Parts", "Weapon Parts"],
        ],
    },
    {
        group: "Furnishings & Other",
        items: [
            ["Furnishings", "Furnishing"],
            ["Exterior Fixtures", "Exterior Fixture"],
            ["Interior Fixtures", "Interior Fixture"],
            ["Outdoor Furnishings", "Outdoor Furnishing"],
            ["Chairs and Beds", "Chair"],
            ["Tables", "Table"],
            ["Tabletop", "Tabletop"],
            ["Wall-mounted", "Wall-mounted"],
            ["Rugs", "Rug"],
            ["Materia", "Materia"],
            ["Crystals", "Crystal"],
            ["Catalysts", "Catalyst"],
            ["Miscellany", "Miscellany"],
            ["Seasonal Miscellany", "Seasonal"],
            ["Minions", "Minion"],
            ["Airship/Submersible Components", "Airship"],
            ["Orchestration Components", "Orchestration"],
            ["Gardening Items", "Gardening"],
            ["Paintings", "Painting"],
            ["Registrable Miscellany", "Registrable"],
            ["Triple Triad Cards", "Triple Triad Card"],
        ],
    },
];

export default function ItemFilterModal({ selected, onChange, onClose }) {
    const backdropRef = useRef(null);

    // Close on Escape
    useEffect(() => {
        function onKey(e) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    function toggle(value) {
        const next = new Set(selected);
        next.has(value) ? next.delete(value) : next.add(value);
        onChange(next);
    }

    function toggleGroup(group) {
        const groupValues = group.items.map(([, v]) => v);
        const allOn = groupValues.every((v) => selected.has(v));
        const next = new Set(selected);
        if (allOn && selected.size === totalCount) {
            // All categories are globally selected — isolate to just this group
            next.clear();
            groupValues.forEach((v) => next.add(v));
        } else {
            groupValues.forEach((v) => (allOn ? next.delete(v) : next.add(v)));
        }
        onChange(next);
    }

    function clearAll() {
        onChange(new Set());
    }

    function selectAll() {
        onChange(new Set(CATEGORY_GROUPS.flatMap((g) => g.items.map(([, v]) => v))));
    }

    const totalCount = CATEGORY_GROUPS.reduce((sum, g) => sum + g.items.length, 0);
    const totalSelected = selected.size;
    const allSelected = totalSelected === totalCount;

    return (
        <>
            {/* Backdrop */}
            <div ref={backdropRef} className="fixed inset-0 bg-black/60 z-[9999]" onClick={onClose} />

            {/* Modal panel */}
            <div className="fixed z-[10000] top-4 bottom-4 left-3 right-3 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[480px] sm:max-h-[88vh] flex flex-col rounded-lg border border-border bg-card shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                    <span className="font-semibold text-sm text-foreground">
                        Item Filters
                        {totalSelected > 0 && (
                            <span className="ml-2 text-xs font-bold text-primary-foreground bg-primary rounded-full px-2 py-0.5">
                                {totalSelected}
                            </span>
                        )}
                    </span>
                    <div className="flex items-center gap-2">
                        {!allSelected && (
                            <button
                                type="button"
                                onClick={selectAll}
                                className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            >
                                Select all
                            </button>
                        )}
                        {totalSelected > 0 && !allSelected && <span className="text-muted-foreground">·</span>}
                        {totalSelected > 0 && (
                            <button
                                type="button"
                                onClick={clearAll}
                                className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                            >
                                Clear all
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close filter selection"
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Scrollable list */}
                <div className="overflow-y-auto flex-1 px-3 py-2">
                    {CATEGORY_GROUPS.map((group) => {
                        const groupValues = group.items.map(([, v]) => v);
                        const allOn = groupValues.every((v) => selected.has(v));
                        const someOn = groupValues.some((v) => selected.has(v));
                        return (
                            <div key={group.group} className="mb-3">
                                {/* Group header row */}
                                <div className="flex items-center justify-between px-1 py-1.5 border-b border-border">
                                    <span className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                                        {group.group}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => toggleGroup(group)}
                                        className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                    >
                                        {allOn
                                            ? totalSelected === totalCount
                                                ? "Select only"
                                                : "Deselect all"
                                            : "Select all"}
                                    </button>
                                </div>
                                {/* Items */}
                                {group.items.map(([label, value]) => (
                                    <label
                                        key={value}
                                        className="flex items-center justify-between gap-3 px-2 py-2 rounded cursor-pointer hover:bg-secondary/50 transition-colors group"
                                    >
                                        <span className="text-sm text-foreground grow">{label}</span>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(value)}
                                            onChange={() => toggle(value)}
                                            className="h-4 w-4 rounded border-border accent-primary cursor-pointer shrink-0"
                                        />
                                    </label>
                                ))}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 border-t border-border shrink-0 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2 text-sm font-semibold rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </>
    );
}
