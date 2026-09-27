"use client";

import { Input } from "@nebutra/ui/primitives";

export function InputErrorDemo() {
  return (
    <Input
      id="email-error"
      type="email"
      label="Email Address"
      defaultValue="not-an-email"
      error="Email address must be valid."
    />
  );
}
