"use client";

import { MagnifyingGlass as Search } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
export function Input2Demo() {
  return (
    <Input
      aria-label="Search projects"
      type="search"
      prefix={<Search aria-hidden="true" />}
      clearable
      placeholder="Search projects"
    />
  );
}
