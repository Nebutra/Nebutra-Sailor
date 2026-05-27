"use client";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@nebutra/ui/primitives";

export function TooltipDemo() {
  return (
    <div className="p-8 flex items-center justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Available to admins and billing owners</TooltipContent>
      </Tooltip>
    </div>
  );
}
