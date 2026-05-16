"use client";

import { Dollar as DollarSign } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";

export function InputWithAddonsDemo() {
  return (
    <div className="flex flex-col gap-4">
      <Input aria-label="Project URL" prefix="https://" suffix=".nebutra.app" placeholder="docs" />
      <Input
        aria-label="Monthly spend"
        prefix={<DollarSign aria-hidden="true" />}
        suffix="USD"
        type="number"
        placeholder="0.00"
      />
    </div>
  );
}
