"use client";

import { Textarea } from "@nebutra/ui/primitives";
export function Textarea3Demo() {
  return (
    <div className="w-full">
      <Textarea aria-label="Disabled message" disabled readOnly value="This field is read-only" />
    </div>
  );
}
