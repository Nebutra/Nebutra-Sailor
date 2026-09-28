"use client";

import { AnimatedShinyText } from "@nebutra/ui/primitives";

export function AnimatedShinyTextDemo() {
  return (
    <div className="p-8 flex w-full items-center justify-center">
      <div className="px-4 py-1.5 text-sm rounded-full border border-border bg-muted/50">
        <AnimatedShinyText>✨ Introducing new features</AnimatedShinyText>
      </div>
    </div>
  );
}
