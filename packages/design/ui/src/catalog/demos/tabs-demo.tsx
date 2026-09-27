"use client";

import { Tabs } from "@nebutra/ui/primitives";
import { useState } from "react";

const tabs = [
  { title: "Apple", value: "apple" },
  { title: "Orange", value: "orange" },
  { title: "Mango", value: "mango" },
] as const;

export function TabsDemo() {
  const [selected, setSelected] = useState("apple");

  return (
    <Tabs
      aria-label="Fruit views"
      selected={selected}
      setSelected={setSelected}
      tabs={tabs}
      className="w-full max-w-md"
    />
  );
}
