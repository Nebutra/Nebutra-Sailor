"use client";

import * as React from "react";
import type { SpacingScale } from "../tokens/spacing";
import { cn } from "../utils/cn";

/**
 * Stack - Vertical layout primitive
 *
 * Arranges children in a vertical stack with consistent spacing.
 *
 * @see apps/landing-page/DESIGN.md Section 10.1
 */

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as a different element */
  as?: React.ElementType;
  /** Gap between children */
  gap?: SpacingScale;
  /** Horizontal alignment */
  align?: "start" | "center" | "end" | "stretch";
  /** Justify content */
  justify?: "start" | "center" | "end" | "between" | "around";
  children?: React.ReactNode;
}

const gapMap: Record<SpacingScale, string> = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
  10: "gap-10",
  12: "gap-12",
  16: "gap-16",
  20: "gap-20",
  24: "gap-24",
  32: "gap-32",
};

const alignMap = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
};

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  (
    {
      as: Component = "div",
      className,
      gap = 4,
      align = "stretch",
      justify = "start",
      children,
      ...props
    },
    ref,
  ) => {
    return React.createElement(
      Component,
      {
        ...props,
        ref,
        className: cn(
          "flex flex-col",
          gapMap[gap],
          alignMap[align],
          justifyMap[justify],
          className,
        ),
      },
      children,
    );
  },
);

Stack.displayName = "Stack";
