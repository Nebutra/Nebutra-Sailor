"use client";

import { Select } from "@nebutra/ui/primitives";

const options = [
  { value: "nextjs", label: "Next.js" },
  { value: "react", label: "React" },
  { value: "sveltekit", label: "SvelteKit" },
] as const;

export function SelectDemo() {
  return (
    <div className="w-full max-w-[var(--select-demo-width)] [--select-demo-width:240px]">
      <Select label="Framework" placeholder="Select a framework" options={options} />
    </div>
  );
}
