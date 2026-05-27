"use client";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";

export function TooltipSideRightDemo() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Right</Button>
        </TooltipTrigger>
        <TooltipContent side="right">Placed beside compact toolbar actions</TooltipContent>
      </Tooltip>
    </div>
  );
}
