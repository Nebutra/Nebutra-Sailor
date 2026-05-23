"use client";

import { Combobox } from "@nebutra/ui/primitives";

export function ComboboxSizesDemo() {
  return (
    <div className="gap-4 flex flex-wrap items-center">
      <Combobox options={[{ value: "small", label: "Small" }]} size="small" placeholder="Small" />
      <Combobox
        options={[{ value: "medium", label: "Medium" }]}
        size="medium"
        placeholder="Medium"
      />
      <Combobox options={[{ value: "large", label: "Large" }]} size="large" placeholder="Large" />
    </div>
  );
}
