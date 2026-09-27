"use client";

import { StatusDot } from "@nebutra/ui/primitives";

const STATES = ["QUEUED", "BUILDING", "READY", "ERROR", "CANCELED"] as const;

export function StatusDotDemo() {
  return (
    <div className="flex flex-col gap-3 p-6">
      {STATES.map((state) => (
        <StatusDot key={state} state={state} label />
      ))}
    </div>
  );
}
