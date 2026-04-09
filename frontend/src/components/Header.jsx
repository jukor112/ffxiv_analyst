import { Gem } from "lucide-react";

export default function Header() {
    return (
        <header
            className="sticky top-0 z-50 border-b-2 border-primary flex items-center gap-4 px-6 py-3.5"
            style={{ background: "linear-gradient(135deg, #08081f 0%, #140828 50%, #08081f 100%)" }}
        >
            {/* Corner decorators */}
            <span className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary/60" />
            <span className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-primary/60" />

            <div className="flex items-center justify-center w-9 h-9 rounded-full border border-primary/40 bg-primary/10 text-primary shrink-0">
                <Gem size={18} />
            </div>

            <div>
                <h1 className="text-base font-bold text-primary tracking-[3px] uppercase">Marketboard Analyst</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                    Final Fantasy XIV — Crafting Profitability Tool
                </p>
            </div>

            <div className="ml-auto hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground/60 uppercase tracking-widest">
                <span className="border border-primary/30 rounded px-1.5 py-0.5 text-primary/50 font-mono">
                    v{__APP_VERSION__}
                </span>
                <span className="w-1 h-1 rounded-full bg-primary/40" />
                universalis
                <span className="w-1 h-1 rounded-full bg-primary/40" />
            </div>
        </header>
    );
}
