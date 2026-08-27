"use client";

import { Input, Label } from "@nebutra/ui/primitives";

export function LabelDisabledDemo() {
  return (
    <div className="space-y-2 max-w-sm w-full">
      <Label htmlFor="disabled-input" className="cursor-not-allowed opacity-50">
        禁用的字段 (Disabled field)
      </Label>
      <Input id="disabled-input" disabled />
    </div>
  );
}
