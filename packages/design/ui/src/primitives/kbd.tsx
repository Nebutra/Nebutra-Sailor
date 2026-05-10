"use client";

import * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Types
// =============================================================================

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /** Renders the ⌘ symbol */
  meta?: boolean;
  /** Renders the ⇧ symbol */
  shift?: boolean;
  /** Renders the ⌥ symbol */
  alt?: boolean;
  /** Renders the ⌃ symbol */
  ctrl?: boolean;
  /** Smaller size variant */
  small?: boolean;
  children?: React.ReactNode;
  className?: string;
}

// =============================================================================
// Modifier symbol map (ordered)
// =============================================================================

const MODIFIER_ORDER = ["meta", "ctrl", "alt", "shift"] as const;

const MODIFIER_SYMBOLS: Record<(typeof MODIFIER_ORDER)[number], string> = {
  meta: "⌘",
  ctrl: "⌃",
  alt: "⌥",
  shift: "⇧",
};

// =============================================================================
// Kbd
// =============================================================================

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ meta, shift, alt, ctrl, small, children, className, ...props }, ref) => {
    const symbols = MODIFIER_ORDER.filter((mod) => {
      if (mod === "meta") return !!meta;
      if (mod === "ctrl") return !!ctrl;
      if (mod === "alt") return !!alt;
      if (mod === "shift") return !!shift;
      return false;
    }).map((mod) => MODIFIER_SYMBOLS[mod]);

    return (
      <kbd
        ref={ref as React.Ref<HTMLElement>}
        className={cn(
          "inline-flex items-center rounded border border-border",
          "bg-muted font-mono leading-none text-muted-foreground",
          small ? "px-1 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[11px]",
          className,
        )}
        {...props}
      >
        {symbols.join("")}
        {children}
      </kbd>
    );
  },
);
Kbd.displayName = "Kbd";

export { Kbd };
