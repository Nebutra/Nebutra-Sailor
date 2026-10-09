"use client";

import { ColorPicker } from "@nebutra/ui/primitives";
import { useState } from "react";

export function ColorPickerDemo() {
  const [color, setColor] = useState("#2e65ee");

  return (
    <div className="flex flex-col items-start gap-3">
      <ColorPicker value={color} onChange={setColor} />
      <p className="font-mono text-xs text-muted-foreground">{color}</p>
    </div>
  );
}
