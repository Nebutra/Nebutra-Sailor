"use client";

import { DynamicIslandTOC } from "@nebutra/ui/primitives";

export function DynamicIslandTocDemo() {
  return (
    <div className="relative w-full p-6">
      <article id="toc-demo-article" className="flex max-w-prose flex-col gap-3">
        <h2 className="font-semibold text-foreground text-lg">Getting started</h2>
        <p className="text-muted-foreground text-sm">Create a project and connect a repository.</p>
        <h2 className="font-semibold text-foreground text-lg">Environment variables</h2>
        <p className="text-muted-foreground text-sm">Keys decide which providers are live.</p>
        <h2 className="font-semibold text-foreground text-lg">Deploying</h2>
        <p className="text-muted-foreground text-sm">Every push to main builds and promotes.</p>
      </article>
      <DynamicIslandTOC selector="#toc-demo-article h2" />
    </div>
  );
}
