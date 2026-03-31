"use client";

import { Separator as BaseSeparator } from "@base-ui/react/separator";
import * as React from "react";
import { cn } from "../utils/cn";

// Base UI natively supports exactOptionalPropertyTypes and doesn't need withHtmlProps.

const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof BaseSeparator> & { decorative?: boolean }
>(({ className, orientation = "horizontal", decorative: _decorative = true, ...props }, ref) => (
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
));
Separator.displayName = "Separator";

export { Separator };
