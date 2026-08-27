import { ChoiceboxGroup } from "@nebutra/ui/primitives";
import { useState } from "react";

export function ChoiceboxDemo() {
  const [value, setValue] = useState("trial");

  return (
    <div className="max-w-2xl px-4 py-8 w-full">
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
    </div>
  );
}
