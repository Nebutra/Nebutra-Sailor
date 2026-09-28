"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";

export function TooltipDemo() {
  return (
    <div className="flex items-center justify-center p-8">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Deploys run on every push to main</TooltipContent>
      </Tooltip>
    </div>
  );
}
