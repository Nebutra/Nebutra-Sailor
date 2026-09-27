"use client";

import { AuroraBackground } from "@nebutra/ui/primitives";

export function AuroraBackgroundDemo() {
  return (
    <div className="relative grid h-72 w-full place-items-center overflow-hidden rounded-[var(--radius-lg)] border border-border bg-background">
      <AuroraBackground variant="subtle" position="top" />
      <p className="relative font-semibold text-2xl text-foreground">
        Ship the product, not the plumbing
      </p>
    </div>
  );
}
