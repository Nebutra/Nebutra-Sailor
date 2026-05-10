"use client";

import * as React from "react";
import { cn } from "../utils";

export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  ratio?: number;
}

const AspectRatio = React.forwardRef<HTMLDivElement, AspectRatioProps>(
  ({ ratio = 1, className, style, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative w-full", className)}
      style={{ aspectRatio: `${ratio}`, ...style }}
      {...props}
    >
      {children}
    </div>
  ),
);

AspectRatio.displayName = "AspectRatio";

export { AspectRatio };
