"use client";

import { LoadingDots } from "@nebutra/ui/primitives";

export function LoadingDotsDemo() {
  return (
    <div className="flex flex-col items-start gap-4 p-6 text-sm text-muted-foreground">
      <LoadingDots>Generating summary</LoadingDots>
      <LoadingDots size={6} />
    </div>
  );
}
