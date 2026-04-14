"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@nebutra/ui/primitives";
import { ChevronDown } from "lucide-react";

export function Collapsible2Demo() {
  return (
    <Collapsible className="w-80 p-4 rounded-md border bg-background shadow-sm">
      <CollapsibleTrigger className="font-medium flex w-full items-center justify-between">
        Advanced Options
        <ChevronDown className="h-4 w-4" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-2 pt-4">
          <p className="text-sm text-muted-foreground">Advanced configuration here.</p>
          <div className="p-3 text-xs rounded-md border bg-muted/50 font-mono text-muted-foreground">
            {'{ "debug": true, "level": "verbose" }'}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
