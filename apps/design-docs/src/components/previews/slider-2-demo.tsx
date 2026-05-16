"use client";

import { Slider } from "@nebutra/ui/primitives";
export function Slider2Demo() {
  return (
    <div className="w-full">
      <Slider defaultValue={50} label="Opacity" max={100} min={0} step={5} unit="%" />
    </div>
  );
}
