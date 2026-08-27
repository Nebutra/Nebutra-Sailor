"use client";

import { cn } from "../utils/cn";
import { BulkActionBar, type BulkActionBarProps } from "./bulk-action-bar";

export interface FloatingBulkActionBarProps extends Omit<BulkActionBarProps, "fixed" | "position"> {
  /** Whether visible */
  visible?: boolean;
}

export function FloatingBulkActionBar({
  visible = true,
  className,
  ...props
}: FloatingBulkActionBarProps) {
  if (!visible || props.selectedCount === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
      <BulkActionBar {...props} fixed={false} className={cn("pointer-events-auto", className)} />
    </div>
  );
}
