"use client";
import { Button, GeistTooltip as Tooltip } from "@nebutra/ui/primitives";

export function TooltipSideRightDemo() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Tooltip position="right" text="The Evil Rabbit Jumped over the Fence">
        <Button variant="outline">Right</Button>
      </Tooltip>
    </div>
  );
}
