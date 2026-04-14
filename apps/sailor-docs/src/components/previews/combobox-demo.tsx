"use client";

import { Combobox } from "@nebutra/ui/primitives";
import { useState } from "react";

const frameworks = [
  { value: "next", label: "Next.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
  { value: "nuxt", label: "Nuxt" },
];

export function ComboboxDemo() {
  const [value, setValue] = useState("");

  return (
    <Combobox
      options={frameworks}
      value={value}
      onChange={setValue}
      placeholder="Select framework..."
    />
  );
}
