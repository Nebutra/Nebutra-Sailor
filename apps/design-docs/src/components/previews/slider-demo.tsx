"use client";

import { Slider } from "@nebutra/ui/primitives";
import { useState } from "react";

export function SliderDemo() {
  const [value, setValue] = useState([50]);

  return (
    <form className="w-full">
      <Slider
        label="Sample Rate"
        max={96}
        min={8}
        onValueChange={setValue}
        step={4}
        unit=" kHz"
        value={value}
      />
    </form>
  );
}
