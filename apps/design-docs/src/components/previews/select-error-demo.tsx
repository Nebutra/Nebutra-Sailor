"use client";

import { Select } from "@nebutra/ui/primitives";

const options = [
  { value: "iad1", label: "Washington, D.C." },
  { value: "sfo1", label: "San Francisco" },
  { value: "hnd1", label: "Tokyo" },
] as const;

export function SelectErrorDemo() {
  return (
    <div className="w-full max-w-[var(--select-demo-width)] [--select-demo-width:260px]">
      <Select
        error="Select a region."
        label="Region"
        placeholder="Select a region"
        options={options}
      />
    </div>
  );
}
