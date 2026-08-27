import { cn } from "../utils/cn";
import { EDITORIAL_BODY, EDITORIAL_EYEBROW, editorialBlock } from "./editorial-surface";

export type EditorialStep = {
  body?: string | null;
  key?: string;
  title: string;
};

export type EditorialStepLadderProps = {
  className?: string;
  label?: string;
  steps: EditorialStep[];
  title?: string | null;
};

/**
 * Ordered procedure.
 *
 * Distinct from `EditorialTimeline`: a timeline reports what happened and is
 * marked with dates, a ladder instructs and is marked with positions the reader
 * is meant to follow in order.
 */
export function EditorialStepLadder({ className, label, steps, title }: EditorialStepLadderProps) {
  const visible = steps.filter((step) => step.title.trim());
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
      <ol className="grid gap-0">
        {visible.map((step, index) => (
          <li
            key={step.key ?? `${index}-${step.title}`}
            className="relative grid grid-cols-[2rem_1fr] gap-4 pb-6 last:pb-0"
          >
            {index < visible.length - 1 && (
              <span
                aria-hidden
                className="absolute bottom-2 left-4 top-9 w-px -translate-x-1/2 bg-border"
              />
            )}
            <span
              aria-hidden
              className="z-10 flex size-8 items-center justify-center rounded-full border border-border bg-background font-mono text-xs font-semibold tabular-nums text-foreground"
            >
              {index + 1}
            </span>
            <div className="min-w-0 pt-1.5">
              <h4 className="text-[0.9375rem] font-semibold leading-6 text-foreground">
                {step.title}
              </h4>
              {step.body && <p className={cn("mt-1.5", EDITORIAL_BODY)}>{step.body}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
