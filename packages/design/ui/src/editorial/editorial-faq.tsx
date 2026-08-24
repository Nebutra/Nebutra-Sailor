import { Plus } from "@nebutra/icons";
import { cn } from "../utils/cn";
import { EDITORIAL_BODY, EDITORIAL_EYEBROW, editorialBlock } from "./editorial-surface";

export type EditorialFaqItem = {
  answer: string;
  key?: string;
  question: string;
};

export type EditorialFaqProps = {
  className?: string;
  /** Open the first entry on load, for a short list where the answer is the point. */
  defaultOpenFirst?: boolean;
  items: EditorialFaqItem[];
  label?: string;
  title?: string | null;
};

/**
 * Collapsible question list.
 *
 * Built on native `<details>` rather than a JS disclosure: it costs no client
 * bundle, works before hydration, is keyboard-operable for free, and lets
 * in-page find surface answers inside collapsed entries.
 */
export function EditorialFaq({
  className,
  defaultOpenFirst = false,
  items,
  label,
  title,
}: EditorialFaqProps) {
  const visible = items.filter((item) => item.question.trim() && item.answer.trim());
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
      <div className="divide-y divide-border border-y border-border">
        {visible.map((item, index) => (
          <details
            key={item.key ?? `${index}-${item.question.slice(0, 24)}`}
            className="group"
            open={defaultOpenFirst && index === 0}
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 py-4 text-[0.9375rem] font-semibold leading-6 text-foreground marker:hidden [&::-webkit-details-marker]:hidden">
              {item.question}
              <Plus
                aria-hidden
                className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-micro group-open:rotate-45"
              />
            </summary>
            <p className={cn("pb-4 pr-8", EDITORIAL_BODY)}>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
