"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";

export function TooltipRichContentDemo() {
  return (
    <div className="flex items-center justify-center p-8">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Rich content</Button>
        </TooltipTrigger>
        <TooltipContent>
          Builds cache for <b>7 days</b>, then rebuild from <i>main</i>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
