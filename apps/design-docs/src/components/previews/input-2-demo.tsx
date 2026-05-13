"use client";

import { MagnifyingGlass as Search } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
export function Input2Demo() {
  return <Input prefix={<Search className="h-4 w-4" />} clearable placeholder="Search…" />;
}
