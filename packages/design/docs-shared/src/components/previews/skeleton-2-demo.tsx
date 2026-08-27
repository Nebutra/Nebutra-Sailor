"use client";

import { Skeleton } from "@nebutra/ui/primitives";
export function Skeleton2Demo() {
  return (
    <div className="space-y-4 w-80 p-4 flex flex-col rounded-xl border shadow-sm">
      <Skeleton className="h-40 w-full rounded-lg" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
