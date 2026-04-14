"use client";

import { Combobox } from "@nebutra/ui/primitives";
export function Combobox8Demo() {
  return (
    <div className="gap-4 flex flex-col items-center justify-center">
      <Combobox options={[{ value: "1", label: "Option 1" }]} size="sm" placeholder="Small" />
      <Combobox
        options={[{ value: "1", label: "Option 1" }]}
        size="default"
        placeholder="Default"
      />
      <Combobox options={[{ value: "1", label: "Option 1" }]} size="lg" placeholder="Large" />
    </div>
  );
}
