"use client";

import { cn } from "@nebutra/ui/utils";
import type { ComponentPropsWithoutRef, HTMLAttributes } from "react";

type ScrollAreaProps = HTMLAttributes<HTMLDivElement>;
type ScrollBarProps = ComponentPropsWithoutRef<"div"> & {
  orientation?: "horizontal" | "vertical";
};

export function ScrollArea({ className, children, ...props }: ScrollAreaProps) {
  return (
    <div className={cn("relative overflow-auto", className)} {...props}>
      {children}
    </div>
  );
}

export function ScrollBar({ className, orientation = "vertical", ...props }: ScrollBarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute rounded-full bg-border/70",
        orientation === "horizontal"
          ? "bottom-1 left-1 right-1 h-1.5"
          : "bottom-1 right-1 top-1 w-1.5",
        className,
      )}
      {...props}
    />
  );
}
