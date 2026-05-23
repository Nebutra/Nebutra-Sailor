"use client";

import { Combobox } from "@nebutra/ui/primitives";
import { useState } from "react";

const frameworks = [
  { value: "next", label: "Next.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
  { value: "nuxt", label: "Nuxt" },
];

export function ComboboxControlledDemo() {
  const [value, setValue] = useState<string | null>("next");

  return (
    <Combobox
      options={frameworks}
      value={value}
      onChange={setValue}
      label="Framework"
      placeholder="Select framework..."
    />
  );
}
