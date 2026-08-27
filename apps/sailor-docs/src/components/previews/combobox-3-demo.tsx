"use client";

import { Combobox } from "@nebutra/ui/primitives";
export function Combobox3Demo() {
  return (
    <Combobox
      options={[
        { value: "next", label: "Next.js" },
        { value: "remix", label: "Remix" },
        { value: "astro", label: "Astro" },
        { value: "nuxt", label: "Nuxt" },
      ]}
      placeholder="Select framework..."
    />
  );
}
