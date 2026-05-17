export function CommandSkeleton() {
  return (
    <div className="border-b border-neutral-5 pb-6">
      <div className="max-w-3xl space-y-3">
        <div className="h-3 w-32 animate-pulse rounded bg-neutral-3" />
        <div className="h-8 w-56 animate-pulse rounded bg-neutral-3" />
        <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-neutral-2" />
        <div className="flex gap-2">
          <div className="h-9 w-32 animate-pulse rounded-[var(--radius-md)] bg-neutral-3" />
          <div className="h-9 w-28 animate-pulse rounded-[var(--radius-md)] bg-neutral-2" />
        </div>
      </div>
    </div>
  );
}

export function MetricsSkeleton() {
  const metricCards = ["active-users", "total-events", "conversions", "revenue"];

  return (
    <div className="space-y-3 rounded-[var(--radius-2xl)] border border-neutral-6 bg-neutral-1 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-3.5 w-36 animate-pulse rounded bg-neutral-3" />
          <div className="h-3 w-48 animate-pulse rounded bg-neutral-2" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-neutral-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        {metricCards.map((id) => (
          <div
            key={id}
            className="h-28 animate-pulse rounded-[var(--radius-xl)] border border-neutral-6 bg-neutral-2"
          />
        ))}
      </div>
    </div>
  );
}

export function RecentSessionsSkeleton() {
  const sessionCards = ["session-1", "session-2", "session-3", "session-4"];

  return (
    <div className="space-y-3 rounded-[var(--radius-2xl)] border border-neutral-6 bg-neutral-1 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-3.5 w-44 animate-pulse rounded bg-neutral-3" />
          <div className="h-3 w-32 animate-pulse rounded bg-neutral-2" />
        </div>
        <div className="h-3 w-20 animate-pulse rounded bg-neutral-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {sessionCards.map((id) => (
          <div
            key={id}
            className="h-16 animate-pulse rounded-[var(--radius-xl)] border border-neutral-6 bg-neutral-2"
          />
        ))}
      </div>
    </div>
  );
}
