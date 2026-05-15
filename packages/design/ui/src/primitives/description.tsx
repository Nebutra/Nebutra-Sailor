"use client";

import { Information as Info } from "@nebutra/icons";
import { forwardRef, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { ContextCard } from "./context-card";

/* -------------------------------------------------------------------------- *\
 *  Description — definition-list metadata block.
 *
 *  Use cases (per Geist guidance):
 *    Short Title Case key paired with a single value:
 *      `Last Deployed`, `Region`, `Plan`, `Build Duration`.
 *    For inline help under a form field, use the input's helper-text slot
 *    instead (Field / FormDescription) — not Description.
 *
 *  Semantics — non-negotiable:
 *    Renders as <dl><dt><dd> so screen readers announce each key/value as a
 *    definition. Wrapping in extra paragraphs or stripping the <dl> breaks
 *    definition-list semantics — do not "simplify" this without an ADR.
 *
 *  Emphasis convention:
 *    The value (<dd>) is the data the user cares about; the label (<dt>) is
 *    supplementary. The visual weight reflects that: dt is muted/secondary,
 *    dd is foreground/medium-weight.
 *
 *  Title slot is text-only:
 *    `title` is typed as string. Don't put interactive controls in the title
 *    slot. Buttons, menus, and links belong in `content` (which accepts
 *    ReactNode) or in the surrounding layout — never in the <dt>.
\* -------------------------------------------------------------------------- */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface DescriptionProps {
  /** Title Case noun naming the field (`Last Deployed`, `Region`). */
  title: string;
  /**
   * Value associated with the title. Sentence case unless the value is a
   * literal identifier, ID, or timestamp that should be preserved verbatim.
   * Accepts ReactNode so links and inline timestamps render correctly.
   */
  content: ReactNode;
  /** Optional one-sentence definition shown via a hover/focus tooltip on the info glyph. Sentence case, ends with a period. */
  tooltip?: ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * @example
 * ```tsx
 * <Description
 *   title="Section Title"
 *   content="Data about this section."
 *   tooltip="Additional context about what this section refers to."
 * />
 * ```
 */
export const Description = forwardRef<HTMLDListElement, DescriptionProps>(function Description(
  { title, content, tooltip, className },
  ref,
) {
  return (
    <dl ref={ref} className={cn("font-sans", className)}>
      <dt className="flex items-center gap-1 text-muted-foreground text-sm capitalize">
        {title}
        {tooltip && (
          <ContextCard.Trigger content={tooltip} side="top" sideOffset={6}>
            <Info aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          </ContextCard.Trigger>
        )}
      </dt>
      <dd className="mt-1 font-medium text-foreground text-sm">{content}</dd>
    </dl>
  );
});
