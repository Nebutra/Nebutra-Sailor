"use client";

import { SectionContainer } from "@nebutra/ui/layouts";
import { Button } from "@nebutra/ui/primitives";

export function PageContainerDemo() {
  return (
    <SectionContainer
      size="lg"
      spacing="md"
      className="relative overflow-hidden rounded-xl border bg-background shadow-sm"
    >
      <div className="inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] absolute" />
      <SectionContainer.Header>
        <h2 className="text-2xl font-bold tracking-tight">Features</h2>
        <p className="mt-2 text-muted-foreground">Everything you need to ship faster.</p>
      </SectionContainer.Header>

      <SectionContainer.Content className="py-12 flex items-center justify-center border-y border-dashed bg-muted/10">
        <p className="text-sm text-muted-foreground">Feature Grid Content</p>
      </SectionContainer.Content>

      <SectionContainer.Footer>
        <Button>View all features</Button>
      </SectionContainer.Footer>
    </SectionContainer>
  );
}
