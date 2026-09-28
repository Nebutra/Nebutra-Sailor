"use client";

import { Combobox } from "@nebutra/ui/primitives";
export function Combobox5Demo() {
  return (
    <Combobox placeholder="Select framework...">
      <Combobox.Input placeholder="Search frameworks..." />
      <Combobox.List emptyMessage="No frameworks found.">
        <Combobox.Group heading="React">
          <Combobox.Option value="next">Next.js</Combobox.Option>
          <Combobox.Option value="remix">Remix</Combobox.Option>
        </Combobox.Group>
        <Combobox.Separator />
        <Combobox.Group heading="Vue">
          <Combobox.Option value="nuxt">Nuxt</Combobox.Option>
        </Combobox.Group>
      </Combobox.List>
    </Combobox>
  );
}
