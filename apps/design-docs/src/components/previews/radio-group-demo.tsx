"use client";

import { RadioGroup } from "@nebutra/ui/primitives";

export function RadioGroupDemo() {
  return (
    <RadioGroup defaultValue="iad1" label="Deployment Region">
      <RadioGroup.Item value="iad1">Washington, D.C.</RadioGroup.Item>
      <RadioGroup.Item value="sfo1">San Francisco</RadioGroup.Item>
      <RadioGroup.Item
        value="fra1"
        disabled
        disabledReason="Available on Pro and Enterprise plans."
      >
        Frankfurt
      </RadioGroup.Item>
    </RadioGroup>
  );
}
