"use client";

import { Label, RadioGroup, RadioGroupItem } from "@nebutra/ui/primitives";

export function RadioGroupDemo() {
  return (
    <RadioGroup defaultValue="comfortable">
      <div className="space-x-2 flex items-center">
        <RadioGroupItem value="default" id="r1" />
        <Label htmlFor="r1">Default</Label>
      </div>
      <div className="space-x-2 flex items-center">
        <RadioGroupItem value="comfortable" id="r2" />
        <Label htmlFor="r2">Comfortable</Label>
      </div>
      <div className="space-x-2 flex items-center">
        <RadioGroupItem value="compact" id="r3" />
        <Label htmlFor="r3">Compact</Label>
      </div>
    </RadioGroup>
  );
}
