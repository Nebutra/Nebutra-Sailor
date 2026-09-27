"use client";

import { Slider } from "@nebutra/ui/primitives";
export function Slider4Demo() {
  return (
    <div className="space-y-2 w-full">
      <div className="text-sm flex justify-between">
        <span>$200</span>
        <span>$800</span>
      </div>
      <Slider defaultValue={500} min={0} max={1000} step={10} />
    </div>
  );
}
