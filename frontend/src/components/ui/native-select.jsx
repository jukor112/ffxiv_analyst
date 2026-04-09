import { cn } from "../../lib/utils";

/** Styled wrapper for native <select> preserving optgroup support */
export function NativeSelect({ className, ...props }) {
    return (
        <select
            className={cn(
                "w-full appearance-none rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground outline-none transition-colors duration-150 focus:border-primary focus:ring-1 focus:ring-primary/50 disabled:opacity-50 cursor-pointer",
                className,
            )}
            {...props}
        />
    );
}
