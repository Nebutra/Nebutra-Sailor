"use client";

import { Select } from "@nebutra/ui/primitives";

const options = [
  { value: "free", label: "Free" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise", disabled: true },
] as const;

export function SelectDisabledDemo() {
  return (
    <div className="w-full max-w-[var(--select-demo-width)] [--select-demo-width:260px]">
      <Select disabled placeholder="Disabled with placeholder" options={options} />
    </div>
  );
}
