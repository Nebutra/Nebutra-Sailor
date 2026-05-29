/**
 * Overlay Component Tokens — Layer 3
 *
 * Dialog, Menu, Popover, Tooltip, and Command surfaces share one depth,
 * elevation, radius, and motion contract. Components should consume these
 * semantic class tokens instead of inlining z-index, shadow, radius, or
 * duration decisions.
 */

import { primitiveRadius, primitiveTransition } from "../primitive";
import { shadowClasses } from "../shadows";

const overlayFocusRingClassName =
  "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export const overlayZIndex = {
  backdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
} as const;

export const overlayTokens = {
  radius: {
    menu: primitiveRadius.lg,
    modal: primitiveRadius.xl,
    popover: primitiveRadius.lg,
    tooltip: primitiveRadius.md,
  },
  motion: {
    duration: primitiveTransition.duration.flow,
    easing: primitiveTransition.easing.default,
    hoverOpenDelay: primitiveTransition.duration.flow,
    hoverCloseDelay: primitiveTransition.duration.micro,
  },
  zIndex: overlayZIndex,
} as const;

export const overlayClassNames = {
  focusRing: overlayFocusRingClassName,
  backdrop:
    "fixed inset-0 bg-black/40 backdrop-blur-sm transition-[opacity,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)] data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
  modalSurface: [
    "fixed left-1/2 top-1/2 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4",
    "border border-border/60 bg-background/95 p-6 text-foreground backdrop-blur-xl",
    "rounded-[var(--radius-xl)]",
    shadowClasses["2xl"],
    "outline-none",
    "transition-[opacity,transform,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)]",
    "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
    "motion-reduce:transition-none motion-reduce:data-starting-style:transform-none motion-reduce:data-ending-style:transform-none",
  ].join(" "),
  commandSurface: [
    "fixed left-1/2 top-[18vh] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden",
    "rounded-[var(--radius-lg)] border border-border/70 bg-popover text-popover-foreground",
    shadowClasses["2xl"],
    "transition-[opacity,transform,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)]",
    "data-starting-style:translate-y-[-0.5rem] data-starting-style:scale-95 data-starting-style:opacity-0",
    "data-ending-style:translate-y-[-0.5rem] data-ending-style:scale-95 data-ending-style:opacity-0",
    "motion-reduce:transition-none motion-reduce:data-starting-style:transform-none motion-reduce:data-ending-style:transform-none",
  ].join(" "),
  menuSurface: [
    "min-w-32 overflow-hidden rounded-[var(--radius-lg)] border border-border/70 bg-popover/95 p-1 text-popover-foreground backdrop-blur-md",
    shadowClasses.xl,
    "outline-none transition-[opacity,transform,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)]",
    "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
    "motion-reduce:transition-none motion-reduce:data-[starting-style]:transform-none motion-reduce:data-[ending-style]:transform-none",
  ].join(" "),
  selectSurface: [
    "max-h-[var(--select-content-max-height)] min-w-[var(--select-content-min-width)] overflow-hidden",
    "rounded-[var(--select-content-radius)] border border-border/70 bg-popover/95 text-popover-foreground backdrop-blur-md",
    "shadow-[var(--select-content-shadow)] outline-none",
    "transition-[opacity,transform,display] duration-[var(--select-duration)] ease-[var(--select-easing)]",
    "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
    "motion-reduce:transition-none motion-reduce:data-starting-style:transform-none motion-reduce:data-ending-style:transform-none",
  ].join(" "),
  navigationMenuSurface: [
    "min-w-32 overflow-hidden rounded-[var(--radius-xl)] border border-border/70 bg-popover/95 text-popover-foreground backdrop-blur-md",
    shadowClasses.xl,
    "outline-none transition-[opacity,transform,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)]",
    "data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0",
    "motion-reduce:transition-none motion-reduce:data-[starting-style]:transform-none motion-reduce:data-[ending-style]:transform-none",
  ].join(" "),
  popoverSurface: [
    "w-72 rounded-[var(--radius-lg)] border border-border/70 bg-popover/95 p-4 text-popover-foreground backdrop-blur-md",
    shadowClasses.xl,
    "outline-none transition-[opacity,transform,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)]",
    "data-[open]:opacity-100 data-[closed]:opacity-0 data-[closed]:scale-95 data-[open]:scale-100",
    "motion-reduce:transition-none motion-reduce:data-[closed]:transform-none motion-reduce:data-[open]:transform-none",
  ].join(" "),
  tooltipSurface: [
    "overflow-hidden rounded-[var(--radius-md)] border border-border/70 bg-popover/95 px-3 py-1.5 text-sm text-popover-foreground backdrop-blur-md",
    shadowClasses.md,
    "transition-[opacity,transform,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)]",
    "data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
    "motion-reduce:transition-none motion-reduce:data-starting-style:transform-none motion-reduce:data-ending-style:transform-none",
  ].join(" "),
  sheetBackdrop: [
    "fixed inset-0 bg-[var(--sheet-overlay-background)] backdrop-blur-[var(--sheet-overlay-blur)]",
    "transition-[opacity,backdrop-filter,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)]",
    "data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
  ].join(" "),
  sheetSurface: [
    "fixed flex flex-col overflow-hidden border border-border bg-[var(--sheet-background)] text-foreground shadow-[var(--sheet-shadow)]",
    "outline-none transition-[opacity,transform,display] duration-[var(--motion-duration-flow)] ease-[var(--ease-out)]",
    "data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
  ].join(" "),
  closeButton: `absolute right-4 top-4 rounded-[var(--radius-sm)] opacity-70 ring-offset-background ${overlayFocusRingClassName} transition-opacity duration-[var(--motion-duration-micro)] ease-[var(--ease-out)] hover:opacity-100 disabled:pointer-events-none data-[open]:bg-accent data-[open]:text-muted-foreground motion-reduce:transition-none`,
} as const;
