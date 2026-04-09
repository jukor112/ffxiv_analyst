import { BarChart3, SearchX } from "lucide-react";

export default function EmptyState({ hasRun }) {
    if (!hasRun) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border border-primary/30 text-primary">
                    <BarChart3 size={26} />
                </div>
                <h3 className="text-base font-semibold text-foreground">Ready to Analyse</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                    Select your server and click <span className="text-primary font-semibold">Analyse Market</span>.
                    <br />
                    The first run builds a recipe cache (~30 s).
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-secondary border border-border text-muted-foreground">
                <SearchX size={26} />
            </div>
            <h3 className="text-base font-semibold text-foreground">No Results Found</h3>
            <p className="text-sm text-muted-foreground">
                Try lowering your filters or selecting a busier world / datacenter.
            </p>
        </div>
    );
}
