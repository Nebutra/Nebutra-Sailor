"use client";

import { SliderNumberFlow } from "@nebutra/ui/primitives";
import { useState } from "react";

export function SliderNumberFlowDemo() {
  const [value, setValue] = useState([50]);

  return (
    <div className="py-8 flex w-full items-center justify-center">
      <SliderNumberFlow
        value={value}
        onValueChange={(val) => setValue(Array.isArray(val) ? [...val] : [val])}
        min={0}
        max={100}
        step={1}
        aria-label="Volume"
        className="w-[60%]"
      />
    </div>
  );
}
