"use client";

import { Input } from "@nebutra/ui/primitives";
import { Search } from "lucide-react";
export function Input2Demo() {
  return <Input prefix={<Search className="h-4 w-4" />} clearable placeholder="Search…" />;
}
