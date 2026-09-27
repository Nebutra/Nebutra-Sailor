"use client";

import { Input } from "@nebutra/ui/primitives";

export function InputWithLabelDemo() {
  return (
    <Input
      id="email"
      type="email"
      label="Email Address"
      placeholder="you@acme.com"
      description="Use the address tied to your team account."
    />
  );
}
