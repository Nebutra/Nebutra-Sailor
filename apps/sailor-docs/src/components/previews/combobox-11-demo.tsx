"use client";

import { Combobox, CommandList } from "@nebutra/ui/primitives";
export function Combobox11Demo() {
  return (
    <Combobox placeholder="Select framework...">
      <Combobox.Input placeholder="Search frameworks..." />
      <CommandList>
        <Combobox.Empty>No frameworks found.</Combobox.Empty>
        <Combobox.Group heading="React">
          <Combobox.Option value="next">Next.js</Combobox.Option>
          <Combobox.Option value="remix">Remix</Combobox.Option>
        </Combobox.Group>
        <Combobox.Separator />
        <Combobox.Group heading="Vue">
          <Combobox.Option value="nuxt">Nuxt</Combobox.Option>
        </Combobox.Group>
      </CommandList>
    </Combobox>
  );
}
