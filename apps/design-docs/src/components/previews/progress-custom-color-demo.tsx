"use client";

import { Progress } from "@nebutra/ui/primitives";

export function ProgressCustomColorDemo() {
  return (
    <div className="w-full">
      <Progress value={75} type="success" className="w-full" />
    </div>
  );
}
