import { useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "./ui/button";

// Poll for SW updates every 60 seconds so the banner appears without a page reload
const POLL_INTERVAL_MS = 60 * 1000;

export default function UpdateBanner() {
    const [dismissed, setDismissed] = useState(false);
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(registration) {
            if (!registration) return;
            setInterval(() => registration.update(), POLL_INTERVAL_MS);
        },
    });

    if (!needRefresh || dismissed) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-6 py-3 border-t border-primary/40 bg-[#08081f]/95 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw size={14} className="text-primary shrink-0" />
                <span>
                    A new version is available.{" "}
                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="text-primary underline underline-offset-2 hover:opacity-80 cursor-pointer"
                    >
                        Reload to update
                    </button>
                </span>
            </div>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setDismissed(true)}
                aria-label="Dismiss update notification"
                className="shrink-0 h-6 w-6 p-0"
            >
                <X size={13} />
            </Button>
        </div>
    );
}
