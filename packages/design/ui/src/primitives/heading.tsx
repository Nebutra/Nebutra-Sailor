"use client";

import * as React from "react";
import { type TextColor, textColors, textStyles } from "../tokens/typography";
import { cn } from "../utils/cn";

/**
 * Heading - Semantic heading primitive
 *
 * Renders h1-h6 elements with appropriate typography styling.
 *
 * @see apps/landing-page/DESIGN.md Section 10.7
 */

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
type HeadingElement = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level (1-6) */
  level?: HeadingLevel;
  /** Override the rendered element (for SEO purposes) */
  as?: HeadingElement;
  /** Text color */
  color?: TextColor;
  /** Use display style instead of heading style */
  display?: boolean;
  /** Text alignment */
  align?: "left" | "center" | "right";
  children?: React.ReactNode;
}

const levelToStyle: Record<HeadingLevel, string> = {
  1: textStyles["heading-1"],
  2: textStyles["heading-2"],
  3: textStyles["heading-3"],
  4: textStyles["heading-4"],
  5: textStyles["heading-4"], // Same as h4
  6: textStyles["heading-4"], // Same as h4
};

const displayStyle: Record<1 | 2, string> = {
  1: textStyles["display-1"],
  2: textStyles["display-2"],
};

const alignMap = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  (
    { level = 2, as, color = "default", display = false, align, className, children, ...props },
    ref,
  ) => {
    const Component = as || (`h${level}` as HeadingElement);

    const styleClass =
      display && (level === 1 || level === 2) ? displayStyle[level as 1 | 2] : levelToStyle[level];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Comp = Component as any;
    return (
      <Comp
        ref={ref}
        className={cn(styleClass, textColors[color], align && alignMap[align], className)}
        {...props}
      >
        {children}
      </Comp>
    );
  },
);

Heading.displayName = "Heading";
