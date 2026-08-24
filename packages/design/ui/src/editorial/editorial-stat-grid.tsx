import { cn } from "../utils/cn";
import {
  EDITORIAL_CAPTION,
  EDITORIAL_EYEBROW,
  EDITORIAL_FIGURE,
  editorialBlock,
} from "./editorial-surface";

export type EditorialStatItem = {
  caption?: string | null;
  key?: string;
  label: string;
  value: string;
};

export type EditorialStatGridProps = {
  className?: string;
  items: EditorialStatItem[];
  label?: string;
  title?: string | null;
};

const COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * Row of headline figures.
 *
 * Cells are separated by shared hairlines rather than being individual cards:
 * boxing each number makes the set read as four unrelated facts, where the
 * point of a stat row is that they are one measurement taken four ways.
 */
export function EditorialStatGrid({ className, items, label, title }: EditorialStatGridProps) {
  const visible = items.filter((item) => item.value.trim() && item.label.trim());
  if (!visible.length) return null;

  const columns = COLUMNS[Math.min(visible.length, 4)] ?? COLUMNS[4];

  return (
    <section
      className={cn(editorialBlock({ spacing: "loose", width: "breakout" }), className)}
      aria-label={title ?? label ?? undefined}
    >
      {(label || title) && (
        <div className="mb-5">
          {label && <div className={EDITORIAL_EYEBROW}>{label}</div>}
          {title && (
            <h3 className="mt-2 text-lg font-semibold leading-6 text-foreground">{title}</h3>
          )}
        </div>
      )}
      <dl
        className={cn(
          "grid divide-y divide-border border-y border-border",
          columns,
          "sm:divide-x sm:divide-y-0",
        )}
      >
        {visible.map((item, index) => (
          <div
            key={item.key ?? `${index}-${item.label}`}
            className="px-0 py-5 sm:px-6 sm:first:pl-0 sm:last:pr-0"
          >
            <dt className="sr-only">{item.label}</dt>
            <dd>
              <span className={cn("block text-3xl leading-none sm:text-4xl", EDITORIAL_FIGURE)}>
                {item.value}
              </span>
              <span className="mt-3 block text-sm font-medium text-foreground">{item.label}</span>
              {item.caption && (
                <span className={cn("mt-1.5 block", EDITORIAL_CAPTION)}>{item.caption}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
