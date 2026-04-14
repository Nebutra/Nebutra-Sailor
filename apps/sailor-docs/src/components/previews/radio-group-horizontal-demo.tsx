"use client";

import { Label, RadioGroup, RadioGroupItem } from "@nebutra/ui/primitives";

export function RadioGroupHorizontalDemo() {
  return (
    <RadioGroup defaultValue="card" className="gap-4 flex">
      <div className="space-x-2 flex items-center">
        <RadioGroupItem value="card" id="card" />
        <Label htmlFor="card">Card</Label>
      </div>
      <div className="space-x-2 flex items-center">
        <RadioGroupItem value="paypal" id="paypal" />
        <Label htmlFor="paypal">PayPal</Label>
      </div>
    </RadioGroup>
  );
}
