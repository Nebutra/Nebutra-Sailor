import { External } from "@nebutra/icons";
import type { ReactNode } from "react";
import { cn } from "../utils/cn";
import { editorialBlock } from "./editorial-surface";

export type EditorialPullQuoteProps = {
  /** Name of the speaker or the work being quoted. */
  attribution?: string | null;
  className?: string;
  /** Portrait slot. Apps pass their own image component so this stays framework-free. */
  portrait?: ReactNode;
  quote: string;
  /** Title, company or context under the attribution. */
  role?: string | null;
  sourceHref?: string | null;
};

/**
 * Display quote lifted out of the reading column.
 *
 * There is no oversized quotation glyph: at this size the type itself already
 * reads as a quote, and the glyph only competes with the first word. Hairlines
 * above and below do the separating.
 */
export function EditorialPullQuote({
  attribution,
  className,
  portrait,
  quote,
  role,
  sourceHref,
}: EditorialPullQuoteProps) {
  if (!quote.trim()) return null;

  const name = attribution ? (
    sourceHref ? (
      <a
        className="inline-flex items-center gap-1.5 text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-[hsl(var(--primary))]"
        href={sourceHref}
        rel="noopener noreferrer"
        target="_blank"
      >
        {attribution}
        <External aria-hidden className="size-3.5 text-muted-foreground" />
      </a>
    ) : (
      attribution
    )
  ) : null;

  return (
    <figure
      className={cn(
        editorialBlock({ spacing: "loose", width: "breakout" }),
        "border-y border-border py-8 sm:py-10",
        className,
      )}
    >
      <blockquote className="text-pretty text-xl font-medium leading-9 text-foreground sm:text-[1.6rem] sm:leading-[2.6rem]">
        {quote}
      </blockquote>
      {(name || role || portrait) && (
        <figcaption className="mt-6 flex items-center gap-3">
          {portrait && (
            <span className="size-9 shrink-0 overflow-hidden rounded-full bg-muted">
              {portrait}
            </span>
          )}
          <span className="min-w-0">
            {name && <span className="block text-sm font-semibold text-foreground">{name}</span>}
            {role && <span className="mt-0.5 block text-sm text-muted-foreground">{role}</span>}
          </span>
        </figcaption>
      )}
    </figure>
  );
}
