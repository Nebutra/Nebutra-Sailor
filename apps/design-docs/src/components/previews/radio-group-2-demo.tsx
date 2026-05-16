"use client";

import { RadioGroup } from "@nebutra/ui/primitives";

export function RadioGroup2Demo() {
  return (
    <RadioGroup defaultValue="card" label="Payment Method" orientation="horizontal">
      <RadioGroup.Item value="card">Card</RadioGroup.Item>
      <RadioGroup.Item value="paypal">PayPal</RadioGroup.Item>
    </RadioGroup>
  );
}
