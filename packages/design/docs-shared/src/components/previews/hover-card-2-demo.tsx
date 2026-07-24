"use client";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@nebutra/ui/primitives";

export function HoverCard2Demo() {
  return (
    <HoverCard>
      <HoverCardTrigger className="text-sm font-medium h-10 px-4 py-2 inline-flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] whitespace-nowrap text-primary underline-offset-4 transition-colors duration-150 ease-out hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50">
        Visit documentation
      </HoverCardTrigger>
      <HoverCardContent side="top" className="w-72">
        <div className="space-y-2">
          <h4 className="font-semibold">Nebutra Docs</h4>
          <p className="text-sm text-muted-foreground">
            Comprehensive guides and API references for building with Nebutra.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
