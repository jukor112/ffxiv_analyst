import { cn } from "../../lib/utils";

export function Label({ className, ...props }) {
    return (
        <label
            className={cn("block text-[10px] font-bold uppercase tracking-[1px] text-primary mb-1.5", className)}
            {...props}
        />
    );
}
