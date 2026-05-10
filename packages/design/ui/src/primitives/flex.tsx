"use client";

import * as React from "react";
import type { SpacingScale } from "../tokens/spacing";
import { cn } from "../utils/cn";

/**
 * Flex - Horizontal layout primitive
 *
 * Arranges children in a horizontal row with consistent spacing.
 *
 * @see apps/landing-page/DESIGN.md Section 10.1
 */

export interface FlexProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Render as a different element */
  as?: React.ElementType;
  /** Gap between children */
  gap?: SpacingScale;
  /** Vertical alignment */
  align?: "start" | "center" | "end" | "baseline" | "stretch";
  /** Horizontal distribution */
  justify?: "start" | "center" | "end" | "between" | "around" | "evenly";
  /** Allow wrapping */
  wrap?: boolean;
  /** Flex direction */
  direction?: "row" | "row-reverse" | "col" | "col-reverse";
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
  baseline: "items-baseline",
  stretch: "items-stretch",
};

const justifyMap = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
  around: "justify-around",
  evenly: "justify-evenly",
};

const directionMap = {
  row: "flex-row",
  "row-reverse": "flex-row-reverse",
  col: "flex-col",
  "col-reverse": "flex-col-reverse",
};

export const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  (
    {
      as: Component = "div",
      className,
      gap = 4,
      align = "center",
      justify = "start",
      wrap = false,
      direction = "row",
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
          "flex",
          directionMap[direction],
          gapMap[gap],
          alignMap[align],
          justifyMap[justify],
          wrap && "flex-wrap",
          className,
        ),
      },
      children,
    );
  },
);

Flex.displayName = "Flex";
