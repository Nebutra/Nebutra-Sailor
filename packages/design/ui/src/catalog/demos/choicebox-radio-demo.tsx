"use client";

import { ChoiceboxGroup } from "@nebutra/ui/primitives";
import * as React from "react";

export function ChoiceboxRadioDemo() {
  const [value, setValue] = React.useState("trial");

  return (
    <ChoiceboxGroup
      direction="row"
      label="Select a plan"
      type="radio"
      value={value}
      onChange={(v) => setValue(v as string)}
    >
      <ChoiceboxGroup.Item title="Pro Trial" description="Free for two weeks" value="trial" />
      <ChoiceboxGroup.Item title="Pro" description="Get started now" value="pro" />
    </ChoiceboxGroup>
  );
}
