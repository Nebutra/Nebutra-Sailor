"use client";

import { Separator } from "@nebutra/ui/primitives";

export function SeparatorVerticalDemo() {
  return (
    <div className="gap-3 h-5 text-sm flex items-center">
      <span>Home</span>
      <Separator orientation="vertical" />
      <span>About</span>
      <Separator orientation="vertical" />
      <span>Contact</span>
    </div>
  );
}
