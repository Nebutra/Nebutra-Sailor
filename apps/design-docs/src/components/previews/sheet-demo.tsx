"use client";

import {
  Button,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@nebutra/ui/primitives";

const rows = [
  ["Status", "Ready"],
  ["Region", "iad1"],
  ["Last Deployment", "2 minutes ago"],
] as const;

export function SheetDemo() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open Sheet</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Deployment Details</SheetTitle>
          <SheetDescription>Inspect the deployment without leaving the table.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <dl className="grid gap-3">
            {rows.map(([label, value]) => (
              <div
                className="grid gap-1 rounded-[var(--radius-lg)] border border-border bg-muted/40 p-3"
                key={label}
              >
                <dt className="font-medium text-muted-foreground text-xs">{label}</dt>
                <dd className="text-foreground text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Close</Button>
          </SheetClose>
          <Button>Open Deployment</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
