"use client";

import { Progress } from "@nebutra/ui/primitives";
export function Progress2Demo() {
  return (
    <div className="space-y-1 w-full">
      <div className="text-sm flex justify-between">
        <span>Uploading...</span>
        <span>65%</span>
      </div>
      <Progress value={65} />
    </div>
  );
}
