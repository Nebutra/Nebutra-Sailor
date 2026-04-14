"use client";

import { ScrollArea } from "@/components/mdx-scroll-area";

export function ScrollAreaListDemo() {
  return (
    <ScrollArea className="h-[250px] w-[350px] rounded-md border text-left">
      {Array.from({ length: 15 }, (_, i) => (
        <div
          key={i}
          className="p-4 border-b border-border/50 transition-colors last:border-0 hover:bg-muted/50"
        >
          <p className="text-sm font-medium mb-1">Notification {i + 1}</p>
          <p className="text-xs text-muted-foreground">{10 * (i + 1)} minutes ago</p>
        </div>
      ))}
    </ScrollArea>
  );
}
