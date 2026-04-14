"use client";

import {
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@nebutra/ui/primitives";

export function SheetMobileDemo() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Share</Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Share this page</SheetTitle>
        </SheetHeader>
        <div className="py-4">Share options here</div>
      </SheetContent>
    </Sheet>
  );
}
