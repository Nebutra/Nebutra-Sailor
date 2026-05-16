"use client";

import {
  Button,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@nebutra/ui/primitives";

const sides = ["top", "right", "bottom", "left"] as const;

export function SheetSideDemo() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {sides.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline">Open {side}</Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>
                {side[0]?.toUpperCase()}
                {side.slice(1)} Context
              </SheetTitle>
              <SheetDescription>This panel slides from the {side} edge.</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <p className="text-muted-foreground text-sm">
                Choose the side that preserves the spatial relationship with the trigger.
              </p>
            </SheetBody>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  );
}
