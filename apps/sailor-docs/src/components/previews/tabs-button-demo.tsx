"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@nebutra/ui/primitives";

export function TabsButtonDemo() {
  return (
    <Tabs defaultValue="tab1" className="w-[400px]">
      <TabsList variant="line" className="w-full">
        <TabsTrigger value="tab1">全部 (All)</TabsTrigger>
        <TabsTrigger value="tab2">进行中 (Active)</TabsTrigger>
        <TabsTrigger value="tab3">已归档 (Archived)</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1" className="p-4 mt-2">
        全部内容 (All content)
      </TabsContent>
      <TabsContent value="tab2" className="p-4 mt-2">
        进行中内容 (Active content)
      </TabsContent>
      <TabsContent value="tab3" className="p-4 mt-2">
        已归档内容 (Archived content)
      </TabsContent>
    </Tabs>
  );
}
