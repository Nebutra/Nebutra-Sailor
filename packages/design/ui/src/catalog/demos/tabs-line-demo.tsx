"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@nebutra/ui/primitives";

export function TabsLineDemo() {
  return (
    <Tabs defaultValue="overview" className="w-full max-w-md">
      <TabsList aria-label="Project sections" variant="line">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="logs" badge="12">
          Logs
        </TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Deployment health and current project ownership.</TabsContent>
      <TabsContent value="logs">Recent events, build traces, and audit entries.</TabsContent>
      <TabsContent value="settings">Project-level controls for owners and maintainers.</TabsContent>
    </Tabs>
  );
}
