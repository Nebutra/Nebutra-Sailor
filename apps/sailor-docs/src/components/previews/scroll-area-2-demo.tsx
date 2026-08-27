"use client";

import { ScrollArea, ScrollBar } from "@/components/mdx-scroll-area";
export function ScrollArea2Demo() {
  return (
    <ScrollArea className="mb-6 w-full max-w-[400px] rounded-md border text-left whitespace-nowrap">
      <div className="space-x-4 p-4 flex w-max">
        {Array.from({ length: 10 }, (_, i) => (
          <figure key={i} className="shrink-0">
            <div className="h-40 w-40 flex items-center justify-center rounded-md bg-muted text-muted-foreground">
              Image {i + 1}
            </div>
          </figure>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
