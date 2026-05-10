"use client";

import { Info } from "lucide-react";
import * as React from "react";
import { cn } from "../utils/cn";
import { ContextCard } from "./context-card";

// =============================================================================
// Types
// =============================================================================

export interface DescriptionProps {
  /** Primary label / heading */
  title: string;
  /** Supporting text shown below the title */
  content: string;
  /** If provided, renders an info icon next to the title that shows this text on hover */
  tooltip?: React.ReactNode;
  /** Additional CSS classes for the wrapper */
  className?: string;
}

// =============================================================================
// Description
// =============================================================================

/**
 * Description — Geist-style heading + subheading block with optional tooltip.
 *
 * @example
 * ```tsx
 * <Description
 *   title="Section Title"
 *   content="Data about this section."
 *   tooltip="Additional context about what this section refers to."
 * />
 * ```
 */
export const Description = React.forwardRef<HTMLDivElement, DescriptionProps>(
  ({ title, content, tooltip, className }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-0.5", className)}>
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium leading-tight text-foreground">{title}</span>
        {tooltip && (
          <ContextCard.Trigger content={tooltip} side="top" sideOffset={6}>
            <Info size={12} aria-hidden="true" className="shrink-0 text-muted-foreground" />
          </ContextCard.Trigger>
        )}
      </div>
      <p className="text-sm leading-snug text-muted-foreground">{content}</p>
    </div>
  ),
);
Description.displayName = "Description";
