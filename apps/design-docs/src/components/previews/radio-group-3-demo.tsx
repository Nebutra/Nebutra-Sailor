"use client";

import { RadioGroup } from "@nebutra/ui/primitives";
import { useState } from "react";

export function RadioGroup3Demo() {
  const [value, setValue] = useState("monthly");

  return (
    <RadioGroup label="Billing Cycle" onChange={setValue} value={value}>
      <RadioGroup.Item value="monthly" description="Pay at the start of each month.">
        Monthly
      </RadioGroup.Item>
      <RadioGroup.Item value="yearly" description="Save 20 percent with one annual invoice.">
        Yearly
      </RadioGroup.Item>
    </RadioGroup>
  );
}
