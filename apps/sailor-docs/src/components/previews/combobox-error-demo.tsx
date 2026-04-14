"use client";

import { Combobox } from "@nebutra/ui/primitives";

export function ComboboxErrorDemo() {
  return (
    <Combobox
      options={[
        { value: "next", label: "Next.js" },
        { value: "remix", label: "Remix" },
        { value: "astro", label: "Astro" },
        { value: "nuxt", label: "Nuxt" },
      ]}
      error
      placeholder="选择框架..."
    />
  );
}
