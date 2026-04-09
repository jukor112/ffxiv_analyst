import { useState } from "react";
import { ScanSearch, Filter } from "lucide-react";
import CacheRow from "./CacheRow";
import ItemFilterModal, { CATEGORY_GROUPS } from "./ItemFilterModal";
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
            minVelocity: 0,
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
        label: "Food Items",
        desc: "Find food items that sell fast and in bulk",
        params: {
            job: "CUL",
            sortBy: "weekly_gil_earned",
            minProfit: 0,
            minVelocity: 2,
            minLevel: 0,
            maxLevel: 0,
            itemSearch: "",
            categoryFilters: new Set(["Meal", "Seafood"]),
            statsWithinDays: 0,
        },
    },
    {
        label: "Food (Trained Eye)",
        desc: "Find food items craftable 100% HQ using the level 80 crafter skill, Trained Eye",
        params: {
            job: "CUL",
            sortBy: "weekly_gil_earned",
            minProfit: 0,
            minVelocity: 0,
            minLevel: 0,
            maxLevel: 70,
            itemSearch: "",
            categoryFilters: new Set(["Meal", "Seafood"]),
            statsWithinDays: 0,
        },
    },
    {
        label: "Furniture & Glamour",
        desc: "Find all worthwhile furniture and glamour items to craft",
        params: {
            job: "ALL",
            sortBy: "weekly_gil_earned",
            minProfit: 0,
            minVelocity: 0,
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
            minVelocity: 0,
            minLevel: 89,
            maxLevel: 90,
            itemSearch: "",
            categoryFilters: new Set(ALL_CATEGORIES),
            statsWithinDays: 0,
        },
    },
    {
        label: "BiS Gear",
        desc: "Find all current BiS gear (Diadochos for Combat / Indagators for Crafter/Gatherer)",
        params: {
            job: "ALL",
            sortBy: "profit",
            minProfit: 0,
            minVelocity: 0,
            minLevel: 0,
            maxLevel: 0,
            itemSearch: "",
            categoryFilters: new Set(ALL_CATEGORIES),
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

export default function Controls({ worlds, cacheInfo, onRefreshCache, onAnalyze, loading }) {
    const [world, setWorld] = useState(() => localStorage.getItem(LS_KEY) ?? "Gilgamesh");
    const [job, setJob] = useState("ALL");
    const [sortBy, setSortBy] = useState("profit");
    const [minProfit, setMinProfit] = useState(0);
    const [minVelocity, setMinVelocity] = useState(0);
    const [limit, setLimit] = useState(50);
    const [minLevel, setMinLevel] = useState(0);
    const [maxLevel, setMaxLevel] = useState(0);
    const [itemSearch, setItemSearch] = useState("");
    const [categoryFilters, setCategoryFilters] = useState(new Set(ALL_CATEGORIES));
    const [statsWithinDays, setStatsWithinDays] = useState(7);
    const [activePreset, setActivePreset] = useState(null);
    const [filterModalOpen, setFilterModalOpen] = useState(false);

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
                    {/* Preset buttons */}
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                            Recommended Presets
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {PRESETS.map((preset) => (
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
                            ))}
                        </div>
                    </div>

                    {/* Main filter grid */}
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-4 gap-y-3.5 items-end">
                        <FieldGroup label="Server / Datacenter">
                            <NativeSelect
                                value={world}
                                onChange={(e) => {
                                    setWorld(e.target.value);
                                    localStorage.setItem(LS_KEY, e.target.value);
                                }}
                                className="col-span-2"
                            >
                                {worldOptions.length ? worldOptions : <option>Loading worlds\u2026</option>}
                            </NativeSelect>
                        </FieldGroup>

                        <FieldGroup label="Job Class">
                            <NativeSelect value={job} onChange={(e) => setJob(e.target.value)}>
                                {JOBS.map((j) => (
                                    <option key={j.value} value={j.value}>
                                        {j.label}
                                    </option>
                                ))}
                            </NativeSelect>
                        </FieldGroup>

                        <FieldGroup label="Sort By">
                            <NativeSelect value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                {SORT_OPTIONS.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </NativeSelect>
                        </FieldGroup>

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

                        <FieldGroup label="Min Sales/Day">
                            <SuffixInput
                                type="number"
                                value={minVelocity}
                                min="0"
                                step="0.1"
                                placeholder="0"
                                suffix="Sales/day"
                                onChange={(e) => setMinVelocity(parseFloat(e.target.value) || 0)}
                            />
                        </FieldGroup>

                        <FieldGroup label="Sale Period">
                            <SuffixInput
                                type="number"
                                value={statsWithinDays === 0 ? "" : statsWithinDays}
                                min="0"
                                max="365"
                                step="1"
                                placeholder="Any"
                                suffix="Days"
                                onChange={(e) => setStatsWithinDays(parseInt(e.target.value) || 0)}
                            />
                        </FieldGroup>

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

                        <FieldGroup label="Item Name Search">
                            <div className="flex rounded-md border border-border bg-input overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50 transition-colors duration-150">
                                <input
                                    type="text"
                                    value={itemSearch}
                                    placeholder="e.g. Diadochos"
                                    className="flex-1 min-w-0 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground bg-transparent outline-none border-0"
                                    onChange={(e) => setItemSearch(e.target.value)}
                                />
                            </div>
                        </FieldGroup>

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

                        <FieldGroup label="Results Limit">
                            <NativeSelect value={limit} onChange={(e) => setLimit(parseInt(e.target.value))}>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={200}>200</option>
                            </NativeSelect>
                        </FieldGroup>

                        <div>
                            <Label className="invisible block mb-1">&nbsp;</Label>
                            <Button
                                variant="primary"
                                size="full"
                                disabled={loading || !world}
                                onClick={handleAnalyzeClick}
                            >
                                <ScanSearch size={14} className="mr-1.5" />
                                Analyse Market
                            </Button>
                            <CacheRow info={cacheInfo} onRefresh={onRefreshCache} />
                        </div>
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
        </>
    );
}
