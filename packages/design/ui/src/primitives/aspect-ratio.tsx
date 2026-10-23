"use client";

import type * as React from "react";
import { cn } from "../utils";

export interface AspectRatioProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Width divided by height, e.g. `16 / 9`. Written to the CSS `aspect-ratio`
   * property, so a `style.aspectRatio` you pass overrides it.
   * @default 1
   */
  ratio?: number;
}

/**
 * A full-width box that holds a fixed width-to-height ratio before its content
 * loads, so media does not shift the layout. Children are not stretched:
 * position them with `absolute inset-0` or `size-full`.
 */
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
