import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-md text-sm font-bold uppercase tracking-wide transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45 cursor-pointer",
    {
        variants: {
            variant: {
                primary:
                    "bg-gradient-to-br from-[#8a7230] to-[#c8a84b] text-background hover:opacity-90 active:scale-[0.98]",
                ghost: "border border-border text-muted-foreground hover:border-primary hover:text-primary active:scale-[0.98]",
                outline: "border border-primary/40 text-primary hover:bg-primary/10 active:scale-[0.98]",
                destructive:
                    "bg-destructive/15 text-destructive border border-destructive/30 hover:bg-destructive/25 active:scale-[0.98]",
            },
            size: {
                default: "h-9 px-5 py-2",
                sm: "h-7 px-3 text-xs",
                lg: "h-10 px-8",
                full: "h-9 px-5 py-2 w-full",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "default",
        },
    },
);

export function Button({ className, variant, size, asChild = false, ...props }) {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
