"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@nebutra/ui/primitives";
export function TabsDemo() {
  return (
    <Tabs defaultValue="overview" className="max-w-md w-full">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm pt-2 text-muted-foreground">Overview content goes here.</p>
      </TabsContent>
      <TabsContent value="analytics">
        <p className="text-sm pt-2 text-muted-foreground">Analytics content goes here.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm pt-2 text-muted-foreground">Settings content goes here.</p>
      </TabsContent>
    </Tabs>
  );
}
