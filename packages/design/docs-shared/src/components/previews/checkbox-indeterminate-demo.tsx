"use client";

import { Checkbox, Label } from "@nebutra/ui/primitives";

export function CheckboxIndeterminateDemo() {
  return (
    <div className="gap-2 flex items-center">
      <Checkbox indeterminate id="i1" />
      <Label htmlFor="i1">选项 1 (Option 1)</Label>
    </div>
  );
}
