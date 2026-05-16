"use client";

import { GridSquare, ListUnordered } from "@nebutra/icons";
import { Tabs, TabsList, TabsTrigger } from "@nebutra/ui/primitives";

export function TabsButtonDemo() {
  return (
    <Tabs defaultValue="grid" className="w-full max-w-sm">
      <TabsList aria-label="View mode" variant="button" className="grid grid-cols-2">
        <TabsTrigger value="grid" icon={<GridSquare aria-hidden />}>
          Grid
        </TabsTrigger>
        <TabsTrigger value="list" icon={<ListUnordered aria-hidden />}>
          List
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
