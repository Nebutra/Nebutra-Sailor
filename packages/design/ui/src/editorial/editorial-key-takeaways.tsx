import { cn } from "../utils/cn";
import { EDITORIAL_EYEBROW, editorialBlock, editorialFrame } from "./editorial-surface";

export type EditorialKeyTakeawayItem = {
  key?: string;
  text: string;
};

export type EditorialKeyTakeawaysProps = {
  className?: string;
  items: EditorialKeyTakeawayItem[];
  /** Eyebrow copy. Pass a localized string; the default is English. */
  label?: string;
  title?: string | null;
};

/**
 * The summary panel that opens a long piece.
 *
 * Numbering is a hairline-separated ordered list rather than bullets or cards —
 * the point is that a reader can take four lines and leave, so nothing should
 * compete with the lines themselves.
 */
export function EditorialKeyTakeaways({
  className,
  items,
  label = "Key takeaways",
  title,
}: EditorialKeyTakeawaysProps) {
  const visible = items.filter((item) => item.text.trim());
  if (!visible.length) return null;

  return (
    <aside
      aria-label={title ?? label}
      className={cn(
        editorialBlock({ spacing: "loose", width: "breakout" }),
        editorialFrame({ elevation: "resting", radius: "panel" }),
        "px-6 py-6 sm:px-8 sm:py-7",
        className,
      )}
    >
      <div className={EDITORIAL_EYEBROW}>{label}</div>
      {title && <h2 className="mt-3 text-xl font-semibold leading-7 text-foreground">{title}</h2>}
      <ol className="mt-5 divide-y divide-border border-t border-border">
        {visible.map((item, index) => (
          <li
            key={item.key ?? `${index}-${item.text.slice(0, 24)}`}
            className="flex gap-4 py-3.5 first:pt-4"
          >
            <span
              aria-hidden
              className="mt-0.5 shrink-0 font-mono text-xs font-semibold tabular-nums text-muted-foreground"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="text-[0.9375rem] leading-7 text-foreground">{item.text}</p>
          </li>
        ))}
      </ol>
    </aside>
  );
}
