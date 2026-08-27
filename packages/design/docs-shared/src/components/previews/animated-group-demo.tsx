"use client";

import { AnimatedGroup } from "@nebutra/ui/primitives";

export function AnimatedGroupDemo() {
  return (
    <div className="p-8 flex w-full items-center justify-center">
      <AnimatedGroup preset="blur-slide" className="gap-3 w-48 flex flex-col">
        {["Item 1", "Item 2", "Item 3", "Item 4"].map((label) => (
          <div key={label} className="p-4 text-sm font-medium rounded-lg border bg-card">
            {label}
          </div>
        ))}
      </AnimatedGroup>
    </div>
  );
}
