/**
 * Streaming placeholders shaped like the page they stand in for, so the footer
 * does not jump up the screen and back when the real rows arrive. A generic
 * spinner here measured CLS 0.70 on /models at 390px; the matching skeleton
 * holds the layout.
 */
function Bar({ className }: { className: string }) {
  return (
    <span className={`block animate-pulse rounded-[var(--radius-sm)] bg-muted ${className}`} />
  );
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div aria-hidden className="overflow-hidden rounded-[var(--radius-lg)] border border-border">
      <div className="hidden h-9 border-b border-border bg-muted/40 md:block" />
      {Array.from({ length: rows }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder rows
        <div
          key={i}
          className="flex h-[3.875rem] items-center gap-3 border-b border-border px-4 last:border-b-0"
        >
          <Bar className="size-8 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Bar className="h-3.5 w-40" />
            <Bar className="h-3 w-28" />
          </div>
          <Bar className="hidden h-3.5 w-14 md:block" />
          <Bar className="hidden h-3.5 w-14 md:block" />
        </div>
      ))}
    </div>
  );
}

export function CatalogSkeleton() {
  return (
    <div className="router-market-shell pt-8 pb-16 md:pt-10" aria-busy="true">
      <Bar className="h-8 w-40" />
      <Bar className="mt-2 h-4 w-64" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder chips
          <Bar key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      <Bar className="mt-3 h-8 w-80 rounded-full" />
      <Bar className="mt-6 mb-3 h-4 w-20" />
      <TableSkeleton rows={12} />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="router-market-shell pt-6 pb-16 md:pt-8" aria-busy="true">
      <Bar className="h-4 w-56" />
      <div className="mt-6 flex items-center gap-3">
        <Bar className="size-10" />
        <Bar className="h-8 w-64" />
      </div>
      <Bar className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-lg)] border border-border md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder stats
          <div key={i} className="h-[4.5rem] px-4 py-3.5">
            <Bar className="h-3 w-12" />
            <Bar className="mt-2 h-5 w-16" />
          </div>
        ))}
      </div>
      <Bar className="mt-12 h-6 w-32" />
      <Bar className="mt-3 h-24 w-full" />
      <Bar className="mt-12 h-6 w-32" />
      <Bar className="mt-3 h-36 w-full" />
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="router-market-shell pb-16" aria-busy="true">
      <div className="grid gap-10 pt-12 pb-12 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:items-center lg:gap-16">
        <div>
          <Bar className="h-12 w-full max-w-lg" />
          <Bar className="mt-4 h-5 w-full max-w-md" />
          <Bar className="mt-8 h-10 w-full max-w-xl" />
          <Bar className="mt-4 h-10 w-64" />
        </div>
        <Bar className="h-40 w-full" />
      </div>
      <Bar className="mb-4 h-10 w-48" />
      <TableSkeleton />
    </div>
  );
}
