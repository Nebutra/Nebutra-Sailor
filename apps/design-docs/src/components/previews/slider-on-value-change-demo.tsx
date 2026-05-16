import { Slider } from "@nebutra/ui/primitives";
import { useState } from "react";

export default function SliderOnValueChangeDemo() {
  const [value, setValue] = useState<number>(50);

  return <Slider label="Bandwidth Cap" onValueChange={setValue} unit="%" value={value} />;
}
