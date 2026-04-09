export default function StatusBar({ status }) {
    if (!status) return null;

    const dotCls =
        status.type === "loading"
            ? "bg-primary animate-pulse-slow"
            : status.type === "ok"
              ? "bg-[#4cba82]"
              : "bg-[#e05050]";

    return (
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted px-4 py-2.5 text-xs text-muted-foreground mb-3.5">
            <span className={`w-2 h-2 rounded-full shrink-0 ${dotCls}`} />
            <span>{status.msg}</span>
        </div>
    );
}
