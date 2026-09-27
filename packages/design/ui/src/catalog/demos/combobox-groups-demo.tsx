"use client";

import { Combobox } from "@nebutra/ui/primitives";

export function ComboboxGroupsDemo() {
  return (
    <Combobox
      options={[
        { value: "next", label: "Next.js", group: "React" },
        { value: "remix", label: "Remix", group: "React" },
        { value: "nuxt", label: "Nuxt", group: "Vue" },
        { value: "svelte", label: "SvelteKit", group: "Svelte" },
      ]}
      label="框架 (Framework)"
      placeholder="选择框架..."
    />
  );
}
