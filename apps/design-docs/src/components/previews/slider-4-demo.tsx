"use client";

import { Slider } from "@nebutra/ui/primitives";
export function Slider4Demo() {
  return (
    <div className="w-full">
      <Slider
        defaultValue={500}
        formatValue={(value) => `$${value}`}
        label="Monthly Spend"
        max={1000}
        min={0}
        step={50}
      />
    </div>
  );
}
