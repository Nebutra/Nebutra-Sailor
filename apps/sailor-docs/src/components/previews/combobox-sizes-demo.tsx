"use client";

import { Combobox } from "@nebutra/ui/primitives"; // Mock import

export function ComboboxSizesDemo() {
  return (
    <div className="gap-4 flex flex-wrap items-center">
      <Combobox
        options={[{ value: "1", label: "选项 1" }]}
        size="sm"
        placeholder="小尺寸 (Small)"
      />
      <Combobox
        options={[{ value: "1", label: "选项 1" }]}
        size="default"
        placeholder="默认 (Default)"
      />
      <Combobox
        options={[{ value: "1", label: "选项 1" }]}
        size="lg"
        placeholder="大尺寸 (Large)"
      />
    </div>
  );
}
