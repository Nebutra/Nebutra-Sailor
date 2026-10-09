"use client";

import { ColorPicker } from "@nebutra/ui/primitives";
import { useState } from "react";

const ACCENTS = ["#3b82c4", "#14b8a6", "#a855f7", "#f97316", "#e11d48", "#334155"] as const;

export function ColorPickerSwatchesDemo() {
  const [color, setColor] = useState<string>(ACCENTS[0]);

  return <ColorPicker swatches={ACCENTS} value={color} onChange={setColor} />;
}
