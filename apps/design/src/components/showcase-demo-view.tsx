"use client";

import { CodeBlock, Tabs, TabsContent, TabsList, TabsTrigger } from "@nebutra/ui/primitives";
import { ShowcaseDemo } from "@/components/showcase-demo";
import { demoLabel } from "@/lib/showcase-model";

/**
 * One demo at the size it really is, with its source beside it. The stage
 * scrolls if the demo is wider than the column; it never scales.
 */
export function ShowcaseDemoView({
  id,
  code,
  blockedReason,
}: {
  id: string;
  code: string | null;
  blockedReason: string | null;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-border">
      <Tabs className="w-full" defaultValue="preview">
        <div className="flex items-center justify-between gap-3 px-5 pt-3">
          <span className="font-mono text-muted-foreground text-xs">{demoLabel(id)}</span>
          <TabsList aria-label={`${demoLabel(id)} views`} variant="line">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger disabled={!code} value="code">
              Code
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent className="m-0" value="preview">
          <div className="isolate min-h-64 transform-gpu overflow-auto border-border border-t bg-background p-6 [contain:paint]">
            {blockedReason ? (
              <p className="text-muted-foreground text-sm">
                Not mounted here: {blockedReason}. Import it and try it in your own app.
              </p>
            ) : (
              <ShowcaseDemo eager id={id} />
            )}
          </div>
        </TabsContent>
        <TabsContent className="m-0" value="code">
          <div className="border-border border-t bg-background">
            {code ? (
              <CodeBlock filename={`${id}.tsx`} language="tsx" maxHeight={520}>
                {code}
              </CodeBlock>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
