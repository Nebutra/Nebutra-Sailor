"use client";

import { Combobox } from "@nebutra/ui/primitives"; // Mock import

export function ComboboxSizesDemo() {
  return (
    <div className="gap-4 flex flex-wrap items-center">
      <Combobox
        options={[{ value: "1", label: "选项 1" }]}
        size="small"
        placeholder="小尺寸 (Small)"
      />
      <Combobox
        options={[{ value: "1", label: "选项 1" }]}
        size="medium"
        placeholder="默认 (Default)"
      />
      <Combobox
        options={[{ value: "1", label: "选项 1" }]}
        size="large"
        placeholder="大尺寸 (Large)"
      />
    </div>
  );
}
