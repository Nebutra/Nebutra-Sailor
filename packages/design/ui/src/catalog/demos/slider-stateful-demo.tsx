"use client";

import { Slider } from "@nebutra/ui/primitives";
import { useState } from "react";

export default function SliderStatefulDemo() {
  const [value, setValue] = useState<number>(50);

  return <Slider onValueChange={setValue} value={value} />;
}
