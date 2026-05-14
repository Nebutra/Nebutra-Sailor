"use client";

import { AspectRatio } from "@nebutra/ui/primitives";

export function AspectRatioDemo() {
  return (
    <div className="w-full max-w-sm">
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-md ring-1 ring-border">
        <div
          className="flex h-full w-full items-center justify-center text-xs font-medium tracking-wider text-white/90"
          style={{ background: "var(--brand-gradient)" }}
        >
          16 / 9
        </div>
      </AspectRatio>
    </div>
  );
}
