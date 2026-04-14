"use client";

import { Input, Label } from "@nebutra/ui/primitives";

export function InputErrorDemo() {
  return (
    <div className="gap-1.5 flex w-full flex-col">
      <Label htmlFor="email-err">Email address</Label>
      <Input
        id="email-err"
        type="email"
        defaultValue="not-an-email"
        className="border-destructive focus-visible:ring-destructive"
        aria-invalid="true"
        aria-describedby="email-error"
      />
      <div id="email-error" className="text-xs text-destructive">
        Please enter a valid email address.
      </div>
    </div>
  );
}
