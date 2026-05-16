"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Variants
// =============================================================================

/**
 * Surface elevation system — maps Geist `type` tokens to @theme shadow + bg.
 * Shadow and background values come entirely from the theme; never hand-crafted.
 *
 * | type        | shadow      | bg            | use case                          |
 * |-------------|-------------|---------------|-----------------------------------|
 * | base        | shadow-sm   | bg-card       | Resting cards (was `card`)        |
 * | small       | shadow-sm   | bg-card       | Smallest raise                    |
 * | medium      | shadow-md   | bg-card       | Medium raise                      |
 * | large       | shadow-lg   | bg-card       | Strong raise                      |
 * | tooltip     | shadow-md   | bg-popover    | Floating tooltip                  |
 * | menu        | shadow-md   | bg-popover    | Dropdowns / popovers              |
 * | modal       | shadow-xl   | bg-popover    | Dialogs / drawers                 |
 * | fullscreen  | shadow-none | bg-background | Full-screen overlays / takeovers  |
 *
 * `card` is kept as a deprecated alias of `base` for back-compat with existing
 * call sites; new code should use the Geist canonical names.
 */
const materialVariants = cva("overflow-hidden rounded-[var(--radius-lg)]", {
  variants: {
    type: {
      base: "bg-card shadow-sm",
      small: "bg-card shadow-sm",
      medium: "bg-card shadow-md",
      large: "bg-card shadow-lg",
      tooltip: "bg-popover shadow-md",
      menu: "bg-popover shadow-md",
      modal: "bg-popover shadow-xl",
      fullscreen: "bg-background shadow-none",
      /** @deprecated Use `base` instead. */
      card: "bg-card shadow-sm",
    },
  },
  defaultVariants: { type: "base" },
});

// =============================================================================
// Types
// =============================================================================

export type MaterialType =
  | "base"
  | "small"
  | "medium"
  | "large"
  | "tooltip"
  | "menu"
  | "modal"
  | "fullscreen"
  /** @deprecated Use `base` instead. */
  | "card";

export interface MaterialProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof materialVariants> {
  /**
   * Surface elevation level. Picks chrome (radius / fill / stroke / shadow)
   * based on where the element sits in the layered hierarchy:
   *   - `base` — resting cards
   *   - `small` / `medium` / `large` — raised content tiers
   *   - `tooltip` / `menu` — floating popovers
   *   - `modal` — dialogs / drawers
   *   - `fullscreen` — takeovers
   *
   * Don't stack two Materials on the same element. If a child needs more
   * elevation, lift it into its own Material with a higher type.
   *
   * @default "base"
   */
  type?: MaterialType;
}

// =============================================================================
// Component
// =============================================================================

export const Material = React.forwardRef<HTMLDivElement, MaterialProps>(
  ({ type, className, children, ...props }, ref) => (
    <div ref={ref} className={cn(materialVariants({ type }), className)} {...props}>
      {children}
    </div>
  ),
);

Material.displayName = "Material";
