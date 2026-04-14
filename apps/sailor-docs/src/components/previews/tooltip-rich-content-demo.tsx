"use client";
import { Button, GeistTooltip as Tooltip } from "@nebutra/ui/primitives";

export function TooltipRichContentDemo() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Tooltip
        text={
          <>
            The <b>Evil Rabbit</b> Jumped over the <i>Fence</i>.
          </>
        }
      >
        <Button variant="outline">Rich Content</Button>
      </Tooltip>
    </div>
  );
}
