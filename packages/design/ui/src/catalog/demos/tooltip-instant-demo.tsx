"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";

export function TooltipInstantDemo() {
  return (
    <div className="flex items-center justify-center p-8">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="outline">No delay</Button>
        </TooltipTrigger>
        <TooltipContent>Opens without the hover delay</TooltipContent>
      </Tooltip>
    </div>
  );
}
