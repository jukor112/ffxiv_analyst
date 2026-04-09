import { cn } from "../../lib/utils";

export function Card({ className, ...props }) {
    return <div className={cn("rounded-lg border border-border bg-card text-card-foreground", className)} {...props} />;
}

export function CardHeader({ className, ...props }) {
    return (
        <div
            className={cn(
                "flex items-center justify-between gap-2 px-4 py-3 border-b border-border flex-wrap",
                className,
            )}
            {...props}
        />
    );
}

export function CardContent({ className, ...props }) {
    return <div className={cn("p-4", className)} {...props} />;
}
