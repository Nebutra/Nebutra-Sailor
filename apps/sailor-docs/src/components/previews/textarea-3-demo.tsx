"use client";

import { Textarea } from "@nebutra/ui/primitives";
export function Textarea3Demo() {
  return (
    <div className="w-full">
      <Textarea disabled value="This field is read-only" />
    </div>
  );
}
