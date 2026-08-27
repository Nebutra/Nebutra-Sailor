"use client";

import type * as React from "react";
import { cn } from "../utils";

export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number;
}

const AspectRatio = ({
  ratio = 1,
  className,
  style,
  children,
  ref,
  ...props
}: AspectRatioProps & { ref?: React.Ref<HTMLDivElement> | undefined }) => (
  <div
    ref={ref}
    className={cn("relative w-full", className)}
    style={{ aspectRatio: `${ratio}`, ...style }}
    {...props}
  >
    {children}
  </div>
);

AspectRatio.displayName = "AspectRatio";

export { AspectRatio };
