export default function ProgressBar({ loading, progress = 0, message = "" }) {
    if (!loading) return null;
    return (
        <div className="mb-3.5">
            <div className="h-[3px] bg-border rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-300 ease-out"
                    style={{
                        width: `${progress}%`,
                        background: "linear-gradient(90deg, #8a7230, #c8a84b, #f0d480)",
                    }}
                />
            </div>
            {message && <p className="text-[10px] text-muted-foreground mt-1">{message}</p>}
        </div>
    );
}
