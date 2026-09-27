"use client";

import { FilterPills } from "@nebutra/ui/primitives";
import { useState } from "react";

const OPTIONS = [
  { value: "all", label: "All", count: 128 },
  { value: "ready", label: "Ready", count: 97 },
  { value: "building", label: "Building", count: 4 },
  { value: "error", label: "Error", count: 27 },
];

export function FilterPillsDemo() {
  const [value, setValue] = useState("all");
  return (
    <div className="p-6">
      <FilterPills options={OPTIONS} value={value} onValueChange={setValue} />
    </div>
  );
}
