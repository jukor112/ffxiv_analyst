export default function ProgressBar({ loading }) {
    if (!loading) return null;
    return (
        <div className="h-[3px] bg-border rounded-full overflow-hidden mb-3.5">
            <div
                className="h-full animate-shimmer"
                style={{
                    background: "linear-gradient(90deg, transparent, #c8a84b, transparent)",
                    width: "60%",
                }}
            />
        </div>
    );
}
