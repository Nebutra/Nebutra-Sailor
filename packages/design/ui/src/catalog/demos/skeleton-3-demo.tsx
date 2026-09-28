"use client";

import { Skeleton } from "@nebutra/ui/primitives";
export function Skeleton3Demo() {
  return (
    <div className="space-y-3 w-80 p-4 rounded-xl border shadow-sm">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="gap-3 flex items-center">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-3.5 w-[140px]" />
            <Skeleton className="h-3 w-[100px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
