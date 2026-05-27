"use client";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";

export function TooltipInstantDemo() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="outline">No delay</Button>
        </TooltipTrigger>
        <TooltipContent>Use only for dense developer tooling</TooltipContent>
      </Tooltip>
    </div>
  );
}
