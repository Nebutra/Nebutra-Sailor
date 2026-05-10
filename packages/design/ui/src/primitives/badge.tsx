"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../utils/cn";
import { Slot, Slottable } from "../utils/slot";

// ─── Variants ─────────────────────────────────────────────────────────────────

const badgeVariants = cva(
  "inline-flex justify-center items-center shrink-0 rounded-full font-sans font-medium whitespace-nowrap tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-transparent",
  {
    variants: {
      variant: {
        // ─── Semantic / brand variants ────────────────────────────────────────
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "border-border text-foreground",
        success: "border-transparent bg-success text-success-foreground hover:bg-success/80",
        warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/80",
        info: "border-transparent bg-info text-info-foreground hover:bg-info/80",
        error:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        // ─── Geist-style color palette ────────────────────────────────────────
        gray: "bg-geist-gray-700 text-white fill-white",
        "gray-subtle":
          "bg-geist-gray-200 text-geist-gray-1000 fill-geist-gray-1000 border-transparent",
        blue: "bg-blue-700 text-white fill-white",
        "blue-subtle": "bg-blue-200 text-blue-900 fill-blue-900 border-transparent",
        purple: "bg-purple-700 text-white fill-white",
        "purple-subtle": "bg-purple-200 text-purple-900 fill-purple-900 border-transparent",
        amber: "bg-amber-700 text-black fill-black",
        "amber-subtle": "bg-amber-200 text-amber-900 fill-amber-900 border-transparent",
        red: "bg-red-700 text-white fill-white",
        "red-subtle": "bg-red-200 text-red-900 fill-red-900 border-transparent",
        pink: "bg-pink-700 text-white fill-white",
        "pink-subtle": "bg-pink-300 text-pink-900 fill-pink-900 border-transparent",
        green: "bg-green-700 text-white fill-white",
        "green-subtle": "bg-green-200 text-green-900 fill-green-900 border-transparent",
        teal: "bg-teal-700 text-white fill-white",
        "teal-subtle": "bg-teal-300 text-teal-900 fill-teal-900 border-transparent",
        inverted: "bg-geist-gray-1000 text-geist-gray-100 fill-geist-gray-100",
        trial: "bg-gradient-to-br from-trial-start to-trial-end text-white fill-white",
        turbo: "bg-gradient-to-br from-turbo-start to-turbo-end text-white fill-white",
        pill: "bg-background text-foreground fill-foreground !border-gray-alpha-400 dark:!border-border",
      },
      size: {
        sm: "text-[11px] h-5 px-1.5 tracking-[0.2px] gap-[3px] [&_svg]:h-[11px] [&_svg]:w-[11px]",
        md: "text-[12px] h-6 px-2.5 tracking-normal gap-1 [&_svg]:h-[14px] [&_svg]:w-[14px]",
        lg: "text-[14px] h-8 px-3 tracking-normal gap-1.5 [&_svg]:h-[16px] [&_svg]:w-[16px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

const dotColorMap: Partial<Record<NonNullable<BadgeProps["variant"]>, string>> = {
  success: "bg-success-foreground",
  warning: "bg-warning-foreground",
  info: "bg-info-foreground",
  error: "bg-destructive-foreground",
  destructive: "bg-destructive-foreground",
  "gray-subtle": "bg-geist-gray-500",
  "green-subtle": "bg-green-500",
  "amber-subtle": "bg-amber-500",
  "red-subtle": "bg-red-500",
  "blue-subtle": "bg-blue-500",
  "purple-subtle": "bg-purple-500",
  "pink-subtle": "bg-pink-500",
  "teal-subtle": "bg-teal-500",
  default: "bg-primary-foreground",
  secondary: "bg-secondary-foreground",
  outline: "bg-muted-foreground",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof badgeVariants> {
  /** Renders a 6×6px status dot before the badge label */
  dot?: boolean;
  /** Icon element rendered before the label (auto-sized to 12×12px) */
  icon?: React.ReactNode;
  /** Render as child element — use with `<a>` for link badges */
  asChild?: boolean;
}

function Badge({
  className,
  variant = "default",
  size = "md",
  dot,
  icon,
  asChild,
  children,
  ...props
}: BadgeProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            dotColorMap[variant ?? "default"] ?? "bg-current",
          )}
        />
      )}
      {icon && (
        <span aria-hidden="true" className="shrink-0 flex items-center justify-center">
          {icon}
        </span>
      )}
      <Slottable>{children}</Slottable>
    </Comp>
  );
}

export { Badge, badgeVariants };
