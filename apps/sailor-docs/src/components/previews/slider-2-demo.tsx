"use client";

import { Slider } from "@nebutra/ui/primitives";
export function Slider2Demo() {
  return (
    <div className="w-full">
      <Slider defaultValue={50} min={0} max={100} step={5} />
    </div>
  );
}
