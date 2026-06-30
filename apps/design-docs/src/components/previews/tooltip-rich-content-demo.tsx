"use client";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";

export function TooltipRichContentDemo() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Rich content</Button>
        </TooltipTrigger>
        <TooltipContent>
          <b>Pro plan</b> includes <i>90-day audit retention</i>.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
