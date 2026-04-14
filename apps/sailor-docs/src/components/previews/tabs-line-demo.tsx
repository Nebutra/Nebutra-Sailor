"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@nebutra/ui/primitives";

export function TabsLineDemo() {
  return (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList variant="button" className="grid grid-cols-3">
        <TabsTrigger value="tab1">Overview</TabsTrigger>
        <TabsTrigger value="tab2">Analytics</TabsTrigger>
        <TabsTrigger value="tab3">Reports</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1" className="p-4 mt-2">
        Overview content
      </TabsContent>
      <TabsContent value="tab2" className="p-4 mt-2">
        Analytics content
      </TabsContent>
      <TabsContent value="tab3" className="p-4 mt-2">
        Reports content
      </TabsContent>
    </Tabs>
  );
}
