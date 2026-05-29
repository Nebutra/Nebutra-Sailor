import type * as React from "react";
import { cn } from "../utils/cn";

export type BaseBadgeDotProps = React.HTMLAttributes<HTMLSpanElement>;

function BaseBadgeDot({ className, ...props }: BaseBadgeDotProps) {
  return (
    <span
      data-slot="badge-dot"
      className={cn("size-1.5 rounded-full bg-[currentColor] opacity-75", className)}
      {...props}
    />
  );
}

export { BaseBadgeDot };
