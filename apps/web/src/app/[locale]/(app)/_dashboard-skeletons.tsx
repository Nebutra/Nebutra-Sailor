export function CommandSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-center">
      <div className="mx-auto h-3 w-28 animate-pulse rounded-full bg-neutral-3" />
      <div className="mx-auto h-6 w-44 animate-pulse rounded-full bg-neutral-3" />
      <div className="h-14 w-full animate-pulse rounded-2xl border border-neutral-6 bg-neutral-2" />
      <div className="flex justify-center gap-2">
        {[64, 80, 96, 72, 80, 88, 72].map((w, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            key={i}
            className="h-7 animate-pulse rounded-full bg-neutral-2"
            style={{ width: w }}
          />
        ))}
      </div>
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-3.5 w-36 animate-pulse rounded bg-neutral-3" />
          <div className="h-3 w-48 animate-pulse rounded bg-neutral-2" />
        </div>
        <div className="h-3 w-24 animate-pulse rounded bg-neutral-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            key={i}
            className="h-20 animate-pulse rounded-xl border border-neutral-6 bg-neutral-2"
          />
        ))}
      </div>
    </div>
  );
}

export function RecentSessionsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-3.5 w-44 animate-pulse rounded bg-neutral-3" />
          <div className="h-3 w-32 animate-pulse rounded bg-neutral-2" />
        </div>
        <div className="h-3 w-20 animate-pulse rounded bg-neutral-2" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            key={i}
            className="h-24 animate-pulse rounded-xl border border-neutral-6 bg-neutral-2"
          />
        ))}
      </div>
    </div>
  );
}

export function OnboardingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <div className="h-3.5 w-32 animate-pulse rounded bg-neutral-3" />
          <div className="h-3 w-56 animate-pulse rounded bg-neutral-2" />
        </div>
        <div className="h-1.5 w-24 animate-pulse rounded-full bg-neutral-2" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
            key={i}
            className="h-16 animate-pulse rounded-xl border border-neutral-6 bg-neutral-2"
          />
        ))}
      </div>
    </div>
  );
}
