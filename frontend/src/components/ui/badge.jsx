import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide", {
    variants: {
        variant: {
            default: "bg-primary/20 text-primary",
            success: "bg-[#4cba82]/15 text-[#4cba82]",
            warning: "bg-primary/15 text-primary",
            danger: "bg-[#e05050]/15 text-[#e05050]",
            muted: "bg-secondary text-muted-foreground",
        },
    },
    defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }) {
    return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}
