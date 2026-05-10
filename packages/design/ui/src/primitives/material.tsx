"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../utils/cn";

// =============================================================================
// Variants
// =============================================================================

/**
 * Surface elevation system — maps semantic `type` to @theme shadow + bg tokens.
 *
 * Shadow and background values come entirely from packages/design/theme/themes.css @theme,
 * never hand-crafted values.
 *
 * | type        | shadow     | bg          | use case              |
 * |-------------|------------|-------------|-----------------------|
 * | card        | shadow-sm  | bg-card     | Page cards            |
 * | menu        | shadow-md  | bg-popover  | Dropdowns / popovers  |
 * | modal       | shadow-lg  | bg-popover  | Dialogs / drawers     |
 * | fullscreen  | shadow-none| bg-background| Full-screen overlays |
 */
const materialVariants = cva("rounded-[var(--radius-lg)] overflow-hidden", {
  variants: {
    type: {
      card: "bg-card shadow-sm",
      menu: "bg-popover shadow-md",
      modal: "bg-popover shadow-lg",
      fullscreen: "bg-background shadow-none",
    },
  },
  defaultVariants: { type: "card" },
});

// =============================================================================
// Types
// =============================================================================

export interface MaterialProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof materialVariants> {
  /**
   * Surface elevation level.
   * - `card` — page card (subtle lift)
   * - `menu` — dropdown / popover (medium shadow)
   * - `modal` — dialog / drawer (strong shadow)
   * - `fullscreen` — full-screen overlay (no shadow)
   * @default "card"
   */
  type?: "card" | "menu" | "modal" | "fullscreen";
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
