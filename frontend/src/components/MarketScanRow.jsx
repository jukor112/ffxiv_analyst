import { gil, timeAgo } from "../utils/format";

const SOURCE_STYLES = {
    shop: { background: "rgba(30,60,80,0.9)", color: "#5ab4e0" },
    drop: { background: "rgba(40,28,16,0.9)", color: "#c8902a" },
};

const SOURCE_BADGE_CLASS =
    "inline-flex items-center rounded px-2 py-1 text-[10px] leading-none font-extrabold tracking-wide whitespace-nowrap";

export default function MarketScanRow({ r, idx }) {
    const tdCls = "px-3 py-2.5 text-[13px] align-middle border-b border-border ";
    const sourceStyle = SOURCE_STYLES[r.source] ?? { background: "rgba(30,30,30,0.9)", color: "#888" };
    const sourceLabel = r.source === "shop" ? "SHOP" : "DROP";

    return (
        <tr className="transition-colors duration-100 hover:bg-[rgba(200,168,75,0.06)]">
            {/* Item */}
            <td className={tdCls}>
                <div className="flex items-center">
                    <span className="font-medium">{r.item_name}</span>
                    <a
                        className="inline-flex items-center justify-center ml-2 opacity-50 hover:opacity-100 transition-opacity"
                        href={`https://universalis.app/market/${r.item_id}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        title="View on Universalis"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#5a9fe0"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="18" y1="20" x2="18" y2="10" />
                            <line x1="12" y1="20" x2="12" y2="4" />
                            <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                    </a>
                    <a
                        className="inline-flex items-center justify-center ml-1 opacity-50 hover:opacity-100 transition-opacity"
                        href={`https://garlandtools.org/db/#item/${r.item_id}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        title="View on Garland Tools"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#60b87a"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                        </svg>
                    </a>
                    <a
                        className="inline-flex items-center justify-center ml-1 opacity-50 hover:opacity-100 transition-opacity"
                        href={`https://ffxiv.consolegameswiki.com/wiki/${encodeURIComponent(r.item_name).replace(/%20/g, "_")}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        onClick={(e) => e.stopPropagation()}
                        title="View on FF14 Wiki"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#c8a84b"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 0 1-2 2z" />
                            <path d="M19 3H6a2 2 0 0 0-2 2v12h14V5a2 2 0 0 0-1-1.73" />
                            <path d="M8 21a2 2 0 0 1-2-2V5" />
                            <line x1="11" y1="7" x2="17" y2="7" />
                            <line x1="11" y1="11" x2="17" y2="11" />
                        </svg>
                    </a>
                </div>
            </td>

            {/* Category */}
            <td className={tdCls}>
                <span className="text-[12px] text-muted-foreground">{r.item_category || "—"}</span>
            </td>

            {/* Source */}
            <td className={tdCls}>
                <div className="flex flex-col gap-0.5 items-center">
                    <span className={SOURCE_BADGE_CLASS} style={sourceStyle}>
                        {sourceLabel}
                    </span>
                </div>
            </td>

            {/* Min Price */}
            <td className={tdCls}>
                <span className="font-mono text-[12px] text-foreground">{gil(r.sell_price)}</span>
            </td>

            {/* Velocity */}
            <td className={tdCls}>
                <span className="font-mono text-[12px] text-muted-foreground">{r.velocity.toFixed(1)}</span>
            </td>

            {/* Weekly Gil */}
            <td className={tdCls}>
                <span className="font-mono text-[12px] text-foreground">{gil(r.weekly_gil_earned)}</span>
            </td>

            {/* Qty Sold */}
            <td className={tdCls}>
                <span className="font-mono text-[12px] text-muted-foreground">{r.weekly_qty_sold}</span>
            </td>

            {/* Last Sold */}
            <td className={tdCls}>
                <span className="text-[12px] text-muted-foreground">{timeAgo(r.last_sold)}</span>
            </td>

            {/* Listings */}
            <td className={tdCls}>
                <span className="text-[12px] text-muted-foreground">{r.listing_count ?? 0}</span>
            </td>
        </tr>
    );
}
