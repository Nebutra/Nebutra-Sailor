"use client";

import { Plus } from "@nebutra/icons";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";

export function TooltipIconButtonDemo() {
  return (
    <div className="flex items-center justify-center p-8">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Add item">
            <Plus className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Adds a row to this table</TooltipContent>
      </Tooltip>
    </div>
  );
}
