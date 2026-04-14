import { Slider } from "@nebutra/ui/primitives";
import { useState } from "react";

export default function SliderOnValueChangeDemo() {
  const [value, setValue] = useState<number>(50);

  return <Slider onValueChange={setValue} value={value} />;
}
