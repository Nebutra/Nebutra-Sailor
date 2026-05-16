"use client";

import { RadioGroup } from "@nebutra/ui/primitives";

export function RadioGroupBillingDemo() {
  return (
    <RadioGroup defaultValue="monthly" label="Billing Cycle">
      <RadioGroup.Item value="monthly">Monthly</RadioGroup.Item>
      <RadioGroup.Item value="yearly" description="Save 20 percent with annual billing.">
        Yearly
      </RadioGroup.Item>
    </RadioGroup>
  );
}
