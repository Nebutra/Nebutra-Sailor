"use client";

import { Separator as BaseSeparator } from "@base-ui/react/separator";
import type * as React from "react";
import { cn } from "../utils/cn";

// Base UI natively supports exactOptionalPropertyTypes and doesn't need withHtmlProps.

/** Visually divides adjacent content with a horizontal or vertical Base UI separator. */
const Separator = ({
  className,
  orientation = "horizontal",
  decorative: _decorative = true,
  ref,
  ...props
}: React.ComponentPropsWithoutRef<typeof BaseSeparator> & {
  /**
   * Compatibility flag accepted but ignored; Base UI retains its separator semantics.
   * @default true
   */
  decorative?: boolean;
} & {
  ref?: React.Ref<HTMLDivElement> | undefined;
}) => (
  <BaseSeparator
    ref={ref}
    orientation={orientation}
    className={cn(
      "shrink-0 bg-border",
      orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
      className,
    )}
    {...props}
  />
);
Separator.displayName = "Separator";

export { Separator };
