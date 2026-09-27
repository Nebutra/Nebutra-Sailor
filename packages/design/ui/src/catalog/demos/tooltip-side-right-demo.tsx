"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";

export function TooltipSideRightDemo() {
  return (
    <div className="flex items-center justify-center p-8">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Right</Button>
        </TooltipTrigger>
        <TooltipContent side="right">Opens to the right of its trigger</TooltipContent>
      </Tooltip>
    </div>
  );
}
