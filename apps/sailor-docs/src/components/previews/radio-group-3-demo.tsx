"use client";

import { Label, RadioGroup, RadioGroupItem } from "@nebutra/ui/primitives";
export function RadioGroup3Demo() {
  return (
    <RadioGroup defaultValue="monthly">
      <div className="space-x-2 flex items-center">
        <RadioGroupItem value="monthly" id="monthly" />
        <Label htmlFor="monthly">Monthly billing</Label>
      </div>
      <div className="space-x-2 flex items-center">
        <RadioGroupItem value="annually" id="annually" />
        <Label htmlFor="annually">Annual billing (save 20%)</Label>
      </div>
    </RadioGroup>
  );
}
