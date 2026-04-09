import { cn } from "../../lib/utils";

/**
 * An input field with a right-aligned suffix label, styled to match the app's
 * border / bg tokens. Usage:
 *   <SuffixInput type="number" value={v} onChange={…} suffix="Gil" />
 */
export function SuffixInput({ suffix, className, inputClassName, ...inputProps }) {
    return (
        <div
            className={cn(
                "flex rounded-md border border-border bg-input overflow-hidden",
                "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50",
                "transition-colors duration-150",
                className,
            )}
        >
            <input
                className={cn(
                    "flex-1 min-w-0 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground",
                    "bg-transparent outline-none border-0 disabled:opacity-50",
                    inputClassName,
                )}
                {...inputProps}
            />
            <span className="inline-flex items-center px-3 bg-muted text-muted-foreground text-xs font-medium border-l border-border whitespace-nowrap">
                {suffix}
            </span>
        </div>
    );
}
