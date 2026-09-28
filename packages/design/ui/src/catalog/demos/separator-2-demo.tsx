"use client";

import { Separator } from "@nebutra/ui/primitives";

export function Separator2Demo() {
  return (
    <div className="flex w-full max-w-md flex-col text-center text-foreground text-sm">
      <p>Section one content</p>
      <Separator className="my-4" />
      <p>Section two content</p>
    </div>
  );
}
