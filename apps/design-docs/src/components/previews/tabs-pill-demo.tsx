"use client";

import { Tabs, TabsList, TabsTrigger } from "@nebutra/ui/primitives";

export function TabsPillDemo() {
  return (
    <Tabs defaultValue="source" className="w-full max-w-sm">
      <TabsList aria-label="Code preview" shape="pill" className="grid grid-cols-2">
        <TabsTrigger value="source">Source</TabsTrigger>
        <TabsTrigger value="output">Output</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
