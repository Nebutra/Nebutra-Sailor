"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@nebutra/ui/primitives";
import { ChevronsUpDown } from "lucide-react";

export function CollapsibleDemo() {
  return (
    <Collapsible className="w-80 space-y-2">
      <div className="px-4 flex items-center justify-between">
        <h4 className="text-sm font-semibold">Team Members</h4>
        <CollapsibleTrigger className="gap-2 text-sm font-medium h-10 w-10 inline-flex items-center justify-center rounded-[var(--radius-md)] whitespace-nowrap transition-colors duration-150 ease-out hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
          <ChevronsUpDown className="h-4 w-4" />
        </CollapsibleTrigger>
      </div>
      <div className="px-4 py-2 text-sm rounded-md border">Alice Johnson</div>
      <CollapsibleContent className="space-y-2">
        <div className="px-4 py-2 text-sm rounded-md border">Bob Smith</div>
        <div className="px-4 py-2 text-sm rounded-md border">Carol White</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
