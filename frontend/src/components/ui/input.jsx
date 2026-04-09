import { cn } from "../../lib/utils";

export function Input({ className, ...props }) {
    return (
        <input
            className={cn(
                "w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors duration-150 focus:border-primary focus:ring-1 focus:ring-primary/50 disabled:opacity-50",
                className,
            )}
            {...props}
        />
    );
}
