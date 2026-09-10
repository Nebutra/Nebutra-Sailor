"use client";

// @primitive-exempt: this IS the primitive — the chrome control every call site should use
// instead of a raw button. Wrapping one here is the point.
// instead of a raw button. Wrapping one here is the point.

import { cn } from "@nebutra/ui/utils";
import { cva } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

export type ChipTone = "default" | "muted" | "primary" | "outline";
export type ChipSize = "chip" | "row" | "control";

/**
 * The 28px control that PARA's chrome is made of — toolbar actions, popover rows, dock toggles.
 *
 * It is a pattern, not a Button variant: the shape is specific to this product's chrome, and
 * @nebutra/ui's Button carries padding and weight that do not belong on a canvas toolbar. Before
 * this existed the same class string was retyped in six files and had already drifted — px-2 in
 * one place, px-2.5 in another, px-3 in a third, with gap and colour varying independently. None
 * of that drift was a decision; it was six people typing from memory.
 *
 * Height comes from --para-h-chip so the three control heights the visual language settled
 * (chip 28 / control 36 / target 44) stay a single source.
 */
const chip: (props?: {
  tone?: ChipTone | null | undefined;
  size?: ChipSize | null | undefined;
  pressed?: boolean | null | undefined;
}) => string = cva(
  "inline-flex shrink-0 items-center gap-1 rounded-md transition-colors disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent",
  {
    variants: {
      tone: {
        default: "text-foreground hover:bg-accent",
        muted: "text-muted-foreground hover:bg-accent hover:text-foreground",
        // The one saturated fill in the workspace — visual-language.md §5 keeps it for spending.
        primary: "bg-primary font-medium text-primary-foreground hover:bg-primary/90",
        outline: "border border-border text-foreground hover:bg-accent",
      },
      size: {
        /** Chrome default. */
        chip: "h-[var(--para-h-chip)] px-2 text-label",
        /** A row inside a popover: full width, left aligned. */
        row: "h-[var(--para-h-chip)] w-full justify-start px-2 text-label",
        /** Dock and drawer controls — the 36px rail. */
        control: "h-[var(--para-h-control)] px-3 text-label",
      },
      pressed: {
        true: "bg-accent text-foreground",
        false: "",
      },
    },
    defaultVariants: { tone: "default", size: "chip", pressed: false },
  },
);

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  tone?: ChipTone;
  size?: ChipSize;
  pressed?: boolean;
}

export function Chip({ className, tone, size, pressed, type, ...props }: ChipProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(chip({ tone, size, pressed }), className)}
      {...props}
    />
  );
}
