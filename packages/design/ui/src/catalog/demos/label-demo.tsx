"use client";

import { Checkbox, Input, Label } from "@nebutra/ui/primitives";

export function LabelDemo() {
  return (
    <div className="space-y-6 max-w-sm p-4 w-full rounded-xl border shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input id="email" type="email" placeholder="you@example.com" />
      </div>

      <div className="space-x-2 flex items-center">
        <Checkbox id="terms" />
        <Label htmlFor="terms">Accept terms and conditions</Label>
      </div>
    </div>
  );
}
