"use client";

import * as React from "react";
import { cn } from "../utils/cn";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

// =============================================================================
// Types
// =============================================================================

export type ContextCardSide = "top" | "bottom" | "left" | "right";

export interface ContextCardTriggerProps {
  /** Content shown in the context card */
  content: React.ReactNode;
  /** Which side the card appears on */
  side?: ContextCardSide;
  /** Offset from the trigger in pixels */
  sideOffset?: number;
  /** The element that triggers the card on hover/focus */
  children: React.ReactNode;
  /** Additional CSS classes for the card */
  className?: string;
}

// =============================================================================
// ContextCardTrigger
// =============================================================================

const ContextCardTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipTrigger>,
  ContextCardTriggerProps
>(({ content, side = "top", sideOffset = 8, children, className }, ref) => (
  <TooltipProvider delayDuration={200}>
    <Tooltip>
      <TooltipTrigger ref={ref} asChild>
        {/* Wrap non-element children in a span so asChild works correctly */}
        {React.isValidElement(children) ? children : <span>{children}</span>}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs overflow-hidden rounded-[var(--radius-lg)] border bg-popover",
          "px-3 py-2 text-sm text-popover-foreground shadow-md",
          "animate-in fade-in-0 zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
          "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
      >
        {content}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
));
ContextCardTrigger.displayName = "ContextCard.Trigger";

// =============================================================================
// Compound Export
// =============================================================================

/**
 * ContextCard — Geist-style hover card that shows rich content on hover/focus.
 *
 * @example
 * ```tsx
 * <ContextCard.Trigger
 *   content="The Evil Rabbit Jumped over the Fence"
 *   side="top"
 * >
 *   <span>Hover me</span>
 * </ContextCard.Trigger>
 * ```
 */
export const ContextCard = {
  Trigger: ContextCardTrigger,
} as const;
