"use client";

import { Skeleton } from "@nebutra/ui/primitives";

export function SkeletonDemo() {
  return (
    <div className="space-x-4 w-80 p-4 flex items-center rounded-xl border shadow-sm">
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[160px]" />
      </div>
    </div>
  );
}
