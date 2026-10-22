/**
 * Where a component is used, from the registry's import-site counts.
 *
 * The count is a name grep, not a call graph, so the section says "import
 * sites" and shows the measurement date; rank and the bar are relative to the
 * other documented components, which is the comparison a count can support.
 */

import {
  COMPONENTS,
  CONSUMER_COUNT_MEASURED,
  type ComponentEntry,
} from "@/lib/components/registry";

export function UsedBy({ entry }: { entry: ComponentEntry }) {
  const ranked = [...COMPONENTS].sort((a, b) => b.consumers - a.consumers);
  const rank = ranked.findIndex((c) => c.slug === entry.slug) + 1;
  const max = ranked[0]?.consumers ?? 1;
  const share = Math.max(2, Math.round((entry.consumers / max) * 100));
  const measured = entry.consumersMeasured ?? CONSUMER_COUNT_MEASURED;

  return (
    <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-end md:gap-12">
      <div className="flex items-baseline gap-3">
        <span className="font-medium text-5xl text-foreground leading-none tracking-display tabular-nums">
          {entry.consumers}
        </span>
        <span className="text-neutral-11 text-sm">import sites in apps</span>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div
          aria-label={`${entry.name} is imported at ${entry.consumers} sites; the most-imported documented component has ${max}`}
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="img"
        >
          <div className="h-full rounded-full bg-foreground" style={{ width: `${share}%` }} />
        </div>
        <p className="m-0 text-muted-foreground text-xs">
          #{rank} of {ranked.length} documented components. Counted {measured} by matching named
          imports from <code className="font-mono">@nebutra/ui</code>, so treat it as accurate to
          about ±2.
        </p>
      </div>
    </div>
  );
}
