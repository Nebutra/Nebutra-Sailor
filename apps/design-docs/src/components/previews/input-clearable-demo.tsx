"use client";

import { Input } from "@nebutra/ui/primitives";
import { useState } from "react";

export function InputClearableDemo() {
  const [value, setValue] = useState("contact@nebutra.com");

  return (
    <Input
      aria-label="Contact email"
      clearable
      value={value}
      onValueChange={setValue}
      placeholder="Type to see the clear button"
    />
  );
}
