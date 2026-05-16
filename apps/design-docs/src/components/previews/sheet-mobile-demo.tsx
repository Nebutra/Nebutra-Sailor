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

export function SheetMobileDemo() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Compact Panel</Button>
      </SheetTrigger>
      <SheetContent side="bottom" noOverlay>
        <SheetHeader>
          <SheetTitle>Global Filters</SheetTitle>
          <SheetDescription>Use Drawer for gesture-driven mobile bottom sheets.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <div className="grid gap-2">
            {["Errors", "Warnings", "Deployments"].map((item) => (
              <label
                className="flex items-center justify-between rounded-[var(--radius-md)] border border-border bg-card px-3 py-2 text-card-foreground text-sm"
                key={item}
              >
                <span>{item}</span>
                <input className="size-4 accent-primary" type="checkbox" />
              </label>
            ))}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
