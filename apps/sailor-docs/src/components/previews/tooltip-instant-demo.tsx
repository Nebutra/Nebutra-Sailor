"use client";
import { Button, GeistTooltip as Tooltip } from "@nebutra/ui/primitives";

export function TooltipInstantDemo() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Tooltip delay={false} text="The Evil Rabbit Jumped over the Fence">
        <Button variant="outline">No delay</Button>
      </Tooltip>
    </div>
  );
}
