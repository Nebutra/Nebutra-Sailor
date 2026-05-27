"use client";
import { Plus } from "@nebutra/icons";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";

export function TooltipIconButtonDemo() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button aria-label="Add item" variant="outline" size="icon">
            <Plus className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Creates a new workspace shortcut</TooltipContent>
      </Tooltip>
    </div>
  );
}
