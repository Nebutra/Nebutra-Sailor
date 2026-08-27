import { cn } from "../utils/cn";
import { EDITORIAL_BODY, EDITORIAL_EYEBROW, editorialBlock } from "./editorial-surface";

export type EditorialTimelineItem = {
  body?: string | null;
  /** Short marker: a year, a quarter, a version. Rendered in tabular figures. */
  marker: string;
  key?: string;
  title: string;
};

export type EditorialTimelineProps = {
  className?: string;
  items: EditorialTimelineItem[];
  label?: string;
  title?: string | null;
};

/**
 * Chronology of events along a single rail.
 *
 * The rail is a 1px border on the list rather than a drawn line per item, so
 * it stays continuous between entries and collapses cleanly when an entry has
 * no body.
 */
export function EditorialTimeline({ className, items, label, title }: EditorialTimelineProps) {
  const visible = items.filter((item) => item.marker.trim() && item.title.trim());
  if (!visible.length) return null;

  return (
    <section
      aria-label={title ?? label ?? undefined}
      className={cn(editorialBlock({ spacing: "loose" }), className)}
    >
      {(label || title) && (
        <div className="mb-5">
          {label && <div className={EDITORIAL_EYEBROW}>{label}</div>}
          {title && (
            <h3 className="mt-2 text-lg font-semibold leading-6 text-foreground">{title}</h3>
          )}
        </div>
      )}
      <ol className="ml-[3.25rem] border-l border-border sm:ml-24">
        {visible.map((item, index) => (
          <li key={item.key ?? `${index}-${item.marker}`} className="relative pb-7 pl-6 last:pb-0">
            <span
              aria-hidden
              className="absolute -left-[0.3125rem] top-1.5 size-2.5 rounded-full border-2 border-background bg-[hsl(var(--primary))]"
            />
            <span
              className="absolute right-[calc(100%+1.5rem)] top-0 whitespace-nowrap font-mono text-xs font-semibold tabular-nums leading-6 text-muted-foreground"
              aria-hidden
            >
              {item.marker}
            </span>
            <h4 className="text-[0.9375rem] font-semibold leading-6 text-foreground">
              <span className="sr-only">{item.marker} — </span>
              {item.title}
            </h4>
            {item.body && <p className={cn("mt-1.5", EDITORIAL_BODY)}>{item.body}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
