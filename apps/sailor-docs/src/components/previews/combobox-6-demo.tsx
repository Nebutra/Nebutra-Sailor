"use client";

import { Combobox } from "@nebutra/ui/primitives";
export function Combobox6Demo() {
  return (
    <Combobox
      options={[
        { value: "next", label: "Next.js" },
        { value: "remix", label: "Remix" },
        { value: "astro", label: "Astro" },
        { value: "nuxt", label: "Nuxt" },
      ]}
      defaultValue="remix"
      disabled
      placeholder="Select framework..."
    />
  );
}
