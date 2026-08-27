"use client";

import { Separator } from "@nebutra/ui/primitives";
export function Separator4Demo() {
  return (
    <div className="relative w-full">
      <Separator />
      <span className="bg-fd-background px-2 text-xs absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-muted-foreground">
        OR
      </span>
    </div>
  );
}
