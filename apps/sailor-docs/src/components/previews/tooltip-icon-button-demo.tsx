"use client";
import { Plus } from "@nebutra/icons";
import { Button, GeistTooltip as Tooltip } from "@nebutra/ui/primitives";

export function TooltipIconButtonDemo() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Tooltip text="Add item">
        <Button variant="outline" size="icon">
          <Plus className="w-4 h-4" />
        </Button>
      </Tooltip>
    </div>
  );
}
