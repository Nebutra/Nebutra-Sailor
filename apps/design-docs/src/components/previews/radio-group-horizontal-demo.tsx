"use client";

import { RadioGroup } from "@nebutra/ui/primitives";

export function RadioGroupHorizontalDemo() {
  return (
    <RadioGroup defaultValue="preview" label="Environment" orientation="horizontal">
      <RadioGroup.Item value="preview">Preview</RadioGroup.Item>
      <RadioGroup.Item value="production">Production</RadioGroup.Item>
    </RadioGroup>
  );
}
