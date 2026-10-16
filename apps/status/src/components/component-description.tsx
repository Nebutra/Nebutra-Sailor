"use client";

import { Information } from "@nebutra/icons";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@nebutra/ui/primitives";

/** A component's description behind a focusable info button — reachable by keyboard and touch. */
export function ComponentDescription({ name, text }: { name: string; text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            iconSize="sm"
            className="-my-1 shrink-0 text-muted-foreground"
            aria-label={`${name}: ${text}`}
          >
            <Information aria-hidden className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
