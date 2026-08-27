"use client";
import { Button, GeistTooltip as Tooltip } from "@nebutra/ui/primitives";

export function TooltipDemo() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Tooltip text="The Evil Rabbit Jumped over the Fence">
        <Button variant="outline">Hover me</Button>
      </Tooltip>
    </div>
  );
}
