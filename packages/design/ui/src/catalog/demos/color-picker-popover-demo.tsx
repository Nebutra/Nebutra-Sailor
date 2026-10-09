"use client";

import { ColorPickerPopover } from "@nebutra/ui/primitives";
import { useState } from "react";

export function ColorPickerPopoverDemo() {
  const [color, setColor] = useState("#8b5cf6");

  return (
    <div className="flex items-center gap-3">
      <ColorPickerPopover value={color} onChange={setColor} />
      <span className="font-mono text-sm text-foreground">{color}</span>
    </div>
  );
}
