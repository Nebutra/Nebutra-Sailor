"use client";

import { Input, Label } from "@nebutra/ui/primitives";

export function InputWithLabelDemo() {
  return (
    <div className="gap-1.5 flex w-full flex-col">
      <Label htmlFor="email">Email address</Label>
      <Input id="email" type="email" placeholder="contact@nebutra.com" />
    </div>
  );
}
