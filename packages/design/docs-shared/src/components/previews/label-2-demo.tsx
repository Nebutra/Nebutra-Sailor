"use client";

import { Input, Label } from "@nebutra/ui/primitives";
export function Label2Demo() {
  return (
    <div className="space-y-2 max-w-sm w-full">
      <Label htmlFor="name">
        Full name
        <span className="ml-1 text-destructive" aria-hidden="true">
          *
        </span>
      </Label>
      <Input id="name" required aria-required="true" />
    </div>
  );
}
