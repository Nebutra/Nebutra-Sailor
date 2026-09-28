"use client";

import { Scroller } from "@nebutra/ui/primitives";

const STEPS = ["Queued", "Installing", "Building", "Checks", "Deploying", "Ready"];

export function ScrollerDemo() {
  return (
    <div className="w-full max-w-md p-6">
      <Scroller
        overflow="x"
        width="100%"
        height={140}
        withButtons
        childrenContainerClassName="gap-3"
      >
        {STEPS.map((step, i) => (
          <div
            key={step}
            className="grid size-32 shrink-0 place-items-center rounded-[var(--radius-md)] border border-border bg-muted text-sm font-medium text-foreground"
          >
            {i + 1}. {step}
          </div>
        ))}
      </Scroller>
    </div>
  );
}
