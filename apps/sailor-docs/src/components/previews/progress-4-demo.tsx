"use client";

import { Progress } from "@nebutra/ui/primitives";
export function Progress4Demo() {
  return (
    <div className="w-full">
      <Progress value={75} className="[&>div]:bg-success w-full" />
    </div>
  );
}
