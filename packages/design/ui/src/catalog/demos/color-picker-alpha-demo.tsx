"use client";

import { ColorPicker } from "@nebutra/ui/primitives";
import { useState } from "react";

export function ColorPickerAlphaDemo() {
  const [color, setColor] = useState("#0bf1c3cc");

  return (
    <div className="flex flex-col items-start gap-3">
      <ColorPicker alpha value={color} onChange={setColor} />
      <p className="font-mono text-xs text-muted-foreground">{color}</p>
    </div>
  );
}
