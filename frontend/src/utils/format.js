export function gil(n) {
    if (n == null) return "—";
    return Math.round(n).toLocaleString("en-US") + " g";
}

export const STRING_COLS = new Set(["item_name", "job"]);
export const SCAN_STRING_COLS = new Set(["item_name", "item_category", "source"]);

export const TABLE_COLS = [
    { key: "item_name", label: "Item" },
    { key: "job", label: "Job" },
    { key: "level", label: "Lvl" },
    { key: "cost", label: "Craft Cost" },
    { key: "sell_price", label: "Avg Sold Price" },
    { key: "profit", label: "Profit" },
    { key: "margin", label: "Margin" },
    { key: "weekly_gil_earned", label: "Weekly Gil" },
    { key: "weekly_purchases", label: "Purchases" },
    { key: "velocity", label: "Sales/Day" },
    { key: "weekly_qty_sold", label: "Qty Sold" },
    { key: "last_sold", label: "Last Sold" },
];

export const SCAN_TABLE_COLS = [
    { key: "item_name", label: "Item" },
    { key: "item_category", label: "Category" },
    { key: "source", label: "Source" },
    { key: "sell_price", label: "Min Price" },
    { key: "velocity", label: "Sales/Day" },
    { key: "weekly_gil_earned", label: "Weekly Gil" },
    { key: "weekly_qty_sold", label: "Qty Sold" },
    { key: "last_sold", label: "Last Sold" },
];

export function timeAgo(unixSeconds) {
    if (!unixSeconds) return "—";
    const seconds = Math.floor(Date.now() / 1000) - unixSeconds;
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}
