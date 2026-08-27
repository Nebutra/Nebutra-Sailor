export default function Loading() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-[var(--radius-lg)] border border-border bg-card"
        />
      ))}
    </div>
  );
}
