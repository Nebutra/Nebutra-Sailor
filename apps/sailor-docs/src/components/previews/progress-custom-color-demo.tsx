"use client";

import { Progress } from "@nebutra/ui/primitives";

export function ProgressCustomColorDemo() {
  return (
    <div className="w-full">
      <Progress value={75} className="[&>div]:bg-green-500 w-full" />
    </div>
  );
}
