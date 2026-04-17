import { useState } from "react";
import { ScanSearch, Filter, Hammer, TrendingUp } from "lucide-react";
import CacheRow from "./CacheRow";
import ItemFilterModal, { CATEGORY_GROUPS } from "./ItemFilterModal";
import HelpModal from "./HelpModal";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { NativeSelect } from "./ui/native-select";
import { SuffixInput } from "./ui/suffix-input";
import { Card, CardContent } from "./ui/card";

const JOBS = [
    { value: "ALL", label: "All Crafters" },
    { value: "CRP", label: "CRP · Carpenter" },
    { value: "BSM", label: "BSM · Blacksmith" },
    { value: "ARM", label: "ARM · Armorer" },
    { value: "GSM", label: "GSM · Goldsmith" },
    { value: "LTW", label: "LTW · Leatherworker" },
    { value: "WVR", label: "WVR · Weaver" },
    { value: "ALC", label: "ALC · Alchemist" },
    { value: "CUL", label: "CUL · Culinarian" },
];

const SORT_OPTIONS = [
    { value: "profit", label: "Profit (gil)" },
    { value: "margin", label: "Profit Margin (%)" },
    { value: "weekly_gil_earned", label: "Weekly Revenue" },
    { value: "weekly_qty_sold", label: "Weekly Qty Sold" },
    { value: "level", label: "Recipe Level" },
    { value: "revenue", label: "Revenue" },
];

const SCAN_SORT_OPTIONS = [
    { value: "weekly_gil_earned", label: "Weekly Revenue" },
    { value: "sell_price", label: "Min Price" },
    { value: "velocity", label: "Sales/Day" },
    { value: "weekly_qty_sold", label: "Weekly Qty Sold" },
];

// All selectable category values across every group.
const ALL_CATEGORIES = new Set(CATEGORY_GROUPS.flatMap((g) => g.items.map(([, v]) => v)));

// Category substrings used by the presets auto-select in the filter modal.
const FURNITURE_CATS = new Set([
    "Furnishing",
    "Exterior Fixture",
    "Interior Fixture",
    "Outdoor Furnishing",
    "Chair",
    "Table",
    "Tabletop",
    "Wall-mounted",
    "Rug",
]);

// BiS gear: combat arms + armor + accessories + crafter/gatherer tools (Courtly / Crested / Gold)
const BIS_CATS = new Set([
    // Combat arms
    "Arcanist",
    "Archer",
    "Astrologian",
    "Blue Mage",
    "Conjurer",
    "Dancer",
    "Dark Knight",
    "Gladiator",
    "Gunbreaker",
    "Lancer",
    "Machinist",
    "Marauder",
    "Pictomancer",
    "Pugilist",
    "Reaper",
    "Red Mage",
    "Rogue",
    "Sage",
    "Samurai",
    "Scholar",
    "Thaumaturge",
    "Viper",
    // Armor
    "Shield",
    "Head",
    "Body",
    "Legs",
    "Hands",
    "Feet",
    // Accessories
    "Necklace",
    "Earring",
    "Bracelet",
    "Ring",
    // Crafter & gatherer tools (incl. Goldsmith)
    "Alchemist",
    "Armorer",
    "Blacksmith",
    "Botanist",
    "Carpenter",
    "Culinarian",
    "Fisher's Tackle",
    "Fisher's Tools",
    "Goldsmith",
    "Leatherworker",
    "Miner",
    "Weaver",
]);

const PRESETS = [
    {
        label: "Default Dawntrail",
        desc: "Search for profitable new Dawntrail items to craft",
        params: {
            job: "ALL",
            sortBy: "weekly_gil_earned",
            minProfit: 5000,
            minVelocity: 0.5,
            minLevel: 91,
            maxLevel: 0,
            itemSearch: "",
            categoryFilters: new Set(ALL_CATEGORIES),
            statsWithinDays: 7,
        },
    },
    {
        label: "Default Search",
        desc: "Default search for profitable items to craft",
        params: {
            job: "ALL",
            sortBy: "profit",
            minProfit: 0,
            minVelocity: 1,
            minLevel: 0,
            maxLevel: 0,
            itemSearch: "",
            categoryFilters: new Set(ALL_CATEGORIES),
            statsWithinDays: 7,
        },
    },
    {
        label: "Fast Selling",
        desc: "Search for fast selling commodity items to craft",
        params: {
            job: "ALL",
            sortBy: "weekly_gil_earned",
            minProfit: 1000,
            minVelocity: 5,
            minLevel: 0,
            maxLevel: 0,
            itemSearch: "",
            categoryFilters: new Set(ALL_CATEGORIES),
            statsWithinDays: 7,
        },
    },
    {
        label: "Consumable Items",
        desc: "Find consumable items that sell fast and in bulk",
        params: {
            job: "ALL",
            sortBy: "weekly_gil_earned",
            minProfit: 0,
            minVelocity: 2,
            minLevel: 0,
            maxLevel: 0,
            itemSearch: "",
            categoryFilters: new Set(["Meal", "Seafood", "Ingredient", "Medicine"]),
            statsWithinDays: 7,
        },
    },

    {
        label: "Furniture & Glamour",
        desc: "Find all worthwhile furniture and glamour items to craft",
        params: {
            job: "ALL",
            sortBy: "weekly_gil_earned",
            minProfit: 0,
            minVelocity: 1,
            minLevel: 0,
            maxLevel: 0,
            itemSearch: "",
            categoryFilters: FURNITURE_CATS,
            statsWithinDays: 0,
        },
    },
    {
        label: "Expert Craft",
        desc: "Find items for pentamelding (expert craft level gear)",
        params: {
            job: "ALL",
            sortBy: "profit",
            minProfit: 30000,
            minVelocity: 1,
            minLevel: 99,
            maxLevel: 100,
            itemSearch: "",
            categoryFilters: new Set(ALL_CATEGORIES),
            statsWithinDays: 0,
        },
    },
    {
        label: "BiS Gear",
        desc: "Find all current BiS gear (Courtly for Combat / Crested for Crafter/Gatherer)",
        params: {
            job: "ALL",
            sortBy: "profit",
            minProfit: 0,
            minVelocity: 1,
            minLevel: 100,
            maxLevel: 100,
            itemSearch: "",
            categoryFilters: BIS_CATS,
            statsWithinDays: 0,
        },
    },
];

const SCAN_PRESETS = [
    {
        label: "All Drops & Shop",
        desc: "All non-craftable/non-gatherable items sorted by weekly revenue",
        params: {
            sortBy: "weekly_gil_earned",
            minPrice: 0,
            minVelocity: 0,
            itemSearch: "",
            categoryFilters: new Set(ALL_CATEGORIES),
            statsWithinDays: 7,
        },
    },
    {
        label: "High Value",
        desc: "Items listing for 100k+ gil, sorted by price",
        params: {
            sortBy: "sell_price",
            minPrice: 100000,
            minVelocity: 0,
            itemSearch: "",
            categoryFilters: new Set(ALL_CATEGORIES),
            statsWithinDays: 0,
        },
    },
    {
        label: "Fast Sellers",
        desc: "Items selling at least once per day",
        params: {
            sortBy: "weekly_gil_earned",
            minPrice: 0,
            minVelocity: 5,
            itemSearch: "",
            categoryFilters: new Set(ALL_CATEGORIES),
            statsWithinDays: 7,
        },
    },
    {
        label: "Minions",
        desc: "Minion items currently on the marketboard",
        params: {
            sortBy: "weekly_gil_earned",
            minPrice: 0,
            minVelocity: 0,
            itemSearch: "",
            categoryFilters: new Set(["Minion"]),
            statsWithinDays: 0,
        },
    },
    {
        label: "Triple Triad",
        desc: "Triple Triad cards currently on the marketboard",
        params: {
            sortBy: "sell_price",
            minPrice: 0,
            minVelocity: 0,
            itemSearch: "",
            categoryFilters: new Set(["Triple Triad Card"]),
            statsWithinDays: 0,
        },
    },
];

function FieldGroup({ label, children }) {
    return (
        <div>
            <Label className="block mb-1">{label}</Label>
            {children}
        </div>
    );
}

const LS_KEY = "ffxiv_world";

export default function Controls({ worlds, cacheInfo, onAnalyze, onScan, loading }) {
    // Shared mode state
    const [mode, setMode] = useState("crafting"); // "crafting" | "scan"

    // Crafting state
    const [world, setWorld] = useState(() => localStorage.getItem(LS_KEY) ?? "Gilgamesh");
    const [job, setJob] = useState("ALL");
    const [sortBy, setSortBy] = useState("profit");
    const [minProfit, setMinProfit] = useState(0);
    const [minVelocity, setMinVelocity] = useState(1);
    const [limit, setLimit] = useState(50);
    const [minLevel, setMinLevel] = useState(0);
    const [maxLevel, setMaxLevel] = useState(0);
    const [itemSearch, setItemSearch] = useState("");
    const [categoryFilters, setCategoryFilters] = useState(new Set(ALL_CATEGORIES));
    const [statsWithinDays, setStatsWithinDays] = useState(7);
    const [activePreset, setActivePreset] = useState(null);
    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);

    // Scan state
    const [scanSortBy, setScanSortBy] = useState("weekly_gil_earned");
    const [scanMinPrice, setScanMinPrice] = useState(0);
    const [scanMinVelocity, setScanMinVelocity] = useState(0);
    const [scanLimit, setScanLimit] = useState(50);
    const [scanItemSearch, setScanItemSearch] = useState("");
    const [scanCategoryFilters, setScanCategoryFilters] = useState(new Set(ALL_CATEGORIES));
    const [scanStatsWithinDays, setScanStatsWithinDays] = useState(7);
    const [activeScanPreset, setActiveScanPreset] = useState(null);
    const [scanFilterModalOpen, setScanFilterModalOpen] = useState(false);

    function applyPreset(preset) {
        const p = preset.params;
        setJob(p.job);
        setSortBy(p.sortBy);
        setMinProfit(p.minProfit);
        setMinVelocity(p.minVelocity);
        setMinLevel(p.minLevel);
        setMaxLevel(p.maxLevel);
        setItemSearch(p.itemSearch);
        setCategoryFilters(new Set(p.categoryFilters));
        setStatsWithinDays(p.statsWithinDays);
        setActivePreset(preset.label);
    }

    function applyScanPreset(preset) {
        const p = preset.params;
        setScanSortBy(p.sortBy);
        setScanMinPrice(p.minPrice);
        setScanMinVelocity(p.minVelocity);
        setScanItemSearch(p.itemSearch);
        setScanCategoryFilters(new Set(p.categoryFilters));
        setScanStatsWithinDays(p.statsWithinDays);
        setActiveScanPreset(preset.label);
    }

    function handleAnalyzeClick() {
        // Send empty string when all (or none) are selected — backend treats "" as "no filter"
        const itemCategory =
            categoryFilters.size === 0 || categoryFilters.size === ALL_CATEGORIES.size
                ? ""
                : [...categoryFilters].join(",");
        onAnalyze({
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
        });
    }

    function handleScanClick() {
        const itemCategory =
            scanCategoryFilters.size === 0 || scanCategoryFilters.size === ALL_CATEGORIES.size
                ? ""
                : [...scanCategoryFilters].join(",");
        onScan({
            world,
            sortBy: scanSortBy,
            minPrice: scanMinPrice,
            minVelocity: scanMinVelocity,
            limit: scanLimit,
            itemSearch: scanItemSearch,
            itemCategory,
            statsWithinDays: scanStatsWithinDays,
        });
    }

    const worldOptions = [];
    for (const [region, dcs] of Object.entries(worlds)) {
        worldOptions.push(
            <optgroup key={`dc-hdr-${region}`} label={`\u2500\u2500 ${region} Datacenters \u2500\u2500`}>
                {Object.keys(dcs).map((dc) => (
                    <option key={`dc-${dc}`} value={dc}>
                        {dc} (whole DC)
                    </option>
                ))}
            </optgroup>,
        );
        for (const [dc, dcWorlds] of Object.entries(dcs)) {
            worldOptions.push(
                <optgroup key={`w-${dc}`} label={`  ${dc}`}>
                    {dcWorlds.map((w) => (
                        <option key={w} value={w}>
                            {w}
                        </option>
                    ))}
                </optgroup>,
            );
        }
    }

    return (
        <>
            <Card className="mb-3.5">
                <CardContent className="flex flex-col gap-4 pt-4">
                    {/* Mode tabs */}
                    <div className="flex gap-1 border-b border-border pb-3 items-center">
                        <button
                            type="button"
                            onClick={() => setMode("crafting")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-colors duration-150 cursor-pointer ${
                                mode === "crafting"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-primary"
                            }`}
                        >
                            <Hammer size={13} />
                            Crafting
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode("scan")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-colors duration-150 cursor-pointer ${
                                mode === "scan"
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:text-primary"
                            }`}
                        >
                            <TrendingUp size={13} />
                            Drops & Shop
                        </button>
                        <button
                            type="button"
                            onClick={() => setHelpOpen(true)}
                            title="How to use this tool"
                            className="ml-auto flex items-center justify-center w-6 h-6 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors duration-150 cursor-pointer text-[11px] font-bold leading-none shrink-0"
                        >
                            ?
                        </button>
                    </div>

                    {/* Preset buttons */}
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                            {mode === "crafting" ? "Recommended Presets" : "Quick Presets"}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {mode === "crafting"
                                ? PRESETS.map((preset) => (
                                      <button
                                          key={preset.label}
                                          title={preset.desc}
                                          type="button"
                                          onClick={() => applyPreset(preset)}
                                          className={`text-[11px] font-medium px-2.5 py-1 rounded border transition-colors duration-150 cursor-pointer ${
                                              activePreset === preset.label
                                                  ? "bg-primary text-primary-foreground border-primary"
                                                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                                          }`}
                                      >
                                          {preset.label}
                                      </button>
                                  ))
                                : SCAN_PRESETS.map((preset) => (
                                      <button
                                          key={preset.label}
                                          title={preset.desc}
                                          type="button"
                                          onClick={() => applyScanPreset(preset)}
                                          className={`text-[11px] font-medium px-2.5 py-1 rounded border transition-colors duration-150 cursor-pointer ${
                                              activeScanPreset === preset.label
                                                  ? "bg-primary text-primary-foreground border-primary"
                                                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                                          }`}
                                      >
                                          {preset.label}
                                      </button>
                                  ))}
                        </div>
                    </div>

                    {/* Main filter grid */}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-3.5 items-end">
                        {/* Server — shared */}
                        <FieldGroup label="Server / Datacenter">
                            <NativeSelect
                                value={world}
                                onChange={(e) => {
                                    setWorld(e.target.value);
                                    localStorage.setItem(LS_KEY, e.target.value);
                                }}
                                className="col-span-2"
                            >
                                {worldOptions.length ? worldOptions : <option>Loading worlds…</option>}
                            </NativeSelect>
                        </FieldGroup>

                        {/* ── Crafting-only fields ── */}
                        {mode === "crafting" && (
                            <FieldGroup label="Job Class">
                                <NativeSelect value={job} onChange={(e) => setJob(e.target.value)}>
                                    {JOBS.map((j) => (
                                        <option key={j.value} value={j.value}>
                                            {j.label}
                                        </option>
                                    ))}
                                </NativeSelect>
                            </FieldGroup>
                        )}

                        {/* Sort By — mode-aware */}
                        <FieldGroup label="Sort By">
                            {mode === "crafting" ? (
                                <NativeSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    {SORT_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </NativeSelect>
                            ) : (
                                <NativeSelect value={scanSortBy} onChange={(e) => setScanSortBy(e.target.value)}>
                                    {SCAN_SORT_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>
                                            {o.label}
                                        </option>
                                    ))}
                                </NativeSelect>
                            )}
                        </FieldGroup>

                        {/* Min Profit / Min Price */}
                        {mode === "crafting" ? (
                            <FieldGroup label="Min Profit">
                                <SuffixInput
                                    type="number"
                                    value={minProfit}
                                    min="0"
                                    step="1000"
                                    placeholder="0"
                                    suffix="Gil"
                                    onChange={(e) => setMinProfit(parseInt(e.target.value) || 0)}
                                />
                            </FieldGroup>
                        ) : (
                            <FieldGroup label="Min Price">
                                <SuffixInput
                                    type="number"
                                    value={scanMinPrice}
                                    min="0"
                                    step="1000"
                                    placeholder="0"
                                    suffix="Gil"
                                    onChange={(e) => setScanMinPrice(parseInt(e.target.value) || 0)}
                                />
                            </FieldGroup>
                        )}

                        {/* Min Sales/Day */}
                        <FieldGroup label="Min Sales/Day">
                            {mode === "crafting" ? (
                                <SuffixInput
                                    type="number"
                                    value={minVelocity}
                                    min="1"
                                    step="0.1"
                                    placeholder="1"
                                    suffix="Sales/day"
                                    onChange={(e) => setMinVelocity(Math.max(1, parseFloat(e.target.value) || 1))}
                                />
                            ) : (
                                <SuffixInput
                                    type="number"
                                    value={scanMinVelocity}
                                    min="1"
                                    step="0.1"
                                    placeholder="1"
                                    suffix="Sales/day"
                                    onChange={(e) => setScanMinVelocity(parseFloat(e.target.value) || 0)}
                                />
                            )}
                        </FieldGroup>

                        {/* Sale Period */}
                        <FieldGroup label="Sale Period">
                            <SuffixInput
                                type="number"
                                value={
                                    mode === "crafting"
                                        ? statsWithinDays === 0
                                            ? ""
                                            : statsWithinDays
                                        : scanStatsWithinDays === 0
                                          ? ""
                                          : scanStatsWithinDays
                                }
                                min="0"
                                max="365"
                                step="1"
                                placeholder="Any"
                                suffix="Days"
                                onChange={(e) => {
                                    const v = parseInt(e.target.value) || 0;
                                    mode === "crafting" ? setStatsWithinDays(v) : setScanStatsWithinDays(v);
                                }}
                            />
                        </FieldGroup>

                        {/* Crafting-only level fields */}
                        {mode === "crafting" && (
                            <>
                                <FieldGroup label="Min Level">
                                    <SuffixInput
                                        type="number"
                                        value={minLevel === 0 ? "" : minLevel}
                                        min="0"
                                        max="100"
                                        step="1"
                                        placeholder="Any"
                                        suffix="Lvl"
                                        onChange={(e) => setMinLevel(parseInt(e.target.value) || 0)}
                                    />
                                </FieldGroup>

                                <FieldGroup label="Max Level">
                                    <SuffixInput
                                        type="number"
                                        value={maxLevel === 0 ? "" : maxLevel}
                                        min="0"
                                        max="100"
                                        step="1"
                                        placeholder="Any"
                                        suffix="Lvl"
                                        onChange={(e) => setMaxLevel(parseInt(e.target.value) || 0)}
                                    />
                                </FieldGroup>
                            </>
                        )}

                        {/* Item Name Search */}
                        <FieldGroup label="Item Name Search">
                            <div className="flex rounded-md border border-border bg-input overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-colors duration-150">
                                <input
                                    type="text"
                                    value={mode === "crafting" ? itemSearch : scanItemSearch}
                                    placeholder={mode === "crafting" ? "e.g. Diadochos" : "e.g. Bahamut"}
                                    className="flex-1 min-w-0 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground bg-transparent outline-none border-0"
                                    onChange={(e) =>
                                        mode === "crafting"
                                            ? setItemSearch(e.target.value)
                                            : setScanItemSearch(e.target.value)
                                    }
                                />
                            </div>
                        </FieldGroup>

                        {/* Item Filters — crafting uses modal; scan uses text input */}
                        {mode === "crafting" ? (
                            <FieldGroup label="Item Filters">
                                <button
                                    type="button"
                                    onClick={() => setFilterModalOpen(true)}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md border border-border bg-input text-left hover:border-primary transition-colors duration-150 cursor-pointer"
                                >
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                        <Filter size={12} />
                                        {categoryFilters.size === 0
                                            ? "No Categories"
                                            : categoryFilters.size === ALL_CATEGORIES.size
                                              ? "All Categories"
                                              : `${categoryFilters.size} / ${ALL_CATEGORIES.size} categories`}
                                    </span>
                                    {categoryFilters.size > 0 && categoryFilters.size < ALL_CATEGORIES.size && (
                                        <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                                            {categoryFilters.size}
                                        </span>
                                    )}
                                </button>
                            </FieldGroup>
                        ) : (
                            <FieldGroup label="Category Filter">
                                <button
                                    type="button"
                                    onClick={() => setScanFilterModalOpen(true)}
                                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md border border-border bg-input text-left hover:border-primary transition-colors duration-150 cursor-pointer"
                                >
                                    <span className="flex items-center gap-1.5 text-muted-foreground">
                                        <Filter size={12} />
                                        {scanCategoryFilters.size === 0
                                            ? "No Categories"
                                            : scanCategoryFilters.size === ALL_CATEGORIES.size
                                              ? "All Categories"
                                              : `${scanCategoryFilters.size} / ${ALL_CATEGORIES.size} categories`}
                                    </span>
                                    {scanCategoryFilters.size > 0 && scanCategoryFilters.size < ALL_CATEGORIES.size && (
                                        <span className="text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 leading-none">
                                            {scanCategoryFilters.size}
                                        </span>
                                    )}
                                </button>
                            </FieldGroup>
                        )}

                        {/* Results Limit */}
                        <FieldGroup label="Results Limit">
                            <NativeSelect
                                value={mode === "crafting" ? limit : scanLimit}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value);
                                    mode === "crafting" ? setLimit(v) : setScanLimit(v);
                                }}
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </NativeSelect>
                        </FieldGroup>
                    </div>

                    <div className="flex items-center gap-3">
                        {mode === "crafting" ? (
                            <Button
                                variant="primary"
                                disabled={loading || !world}
                                onClick={handleAnalyzeClick}
                                className="px-6"
                            >
                                <ScanSearch size={14} className="mr-1.5" />
                                Scan
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                disabled={loading || !world}
                                onClick={handleScanClick}
                                className="px-6"
                            >
                                <ScanSearch size={14} className="mr-1.5" />
                                Scan
                            </Button>
                        )}
                        <CacheRow info={cacheInfo} />
                    </div>
                </CardContent>
            </Card>

            {filterModalOpen && (
                <ItemFilterModal
                    selected={categoryFilters}
                    onChange={setCategoryFilters}
                    onClose={() => setFilterModalOpen(false)}
                />
            )}
            {scanFilterModalOpen && (
                <ItemFilterModal
                    selected={scanCategoryFilters}
                    onChange={setScanCategoryFilters}
                    onClose={() => setScanFilterModalOpen(false)}
                />
            )}
            {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
        </>
    );
}
