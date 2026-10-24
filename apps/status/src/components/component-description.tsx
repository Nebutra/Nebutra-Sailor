"use client";

import { Information } from "@nebutra/icons";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@nebutra/ui/primitives";

/**
 * A component's description behind an info button. A popover, not a
 * tooltip: hover opens it on pointer devices and a tap opens it on touch,
 * where tooltips never appear. Portaled and collision-aware like every other
 * floating layer on the page.
 */
export function ComponentDescription({ name, text }: { name: string; text: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild openOnHover delay={150}>
        <Button
          type="button"
          variant="ghost"
          iconSize="sm"
          className="-my-1 shrink-0 text-muted-foreground"
          aria-label={`${name}: ${text}`}
          data-component-description=""
        >
          <Information aria-hidden className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={6} className="w-auto max-w-64 p-2.5 text-xs leading-5">
        {text}
      </PopoverContent>
    </Popover>
  );
}
