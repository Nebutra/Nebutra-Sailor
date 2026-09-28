"use client";

import { Input, Label } from "@nebutra/ui/primitives";
export function Label4Demo() {
  return (
    <div className="space-y-2 max-w-sm w-full">
      <Label htmlFor="disabled-input" className="cursor-not-allowed opacity-50">
        Disabled field
      </Label>
      <Input id="disabled-input" disabled />
    </div>
  );
}
