"use client";

import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@nebutra/ui/primitives";
import { Menu } from "lucide-react";
import Link from "next/link";

<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-64">
    <SheetHeader>
      <SheetTitle>Navigation</SheetTitle>
    </SheetHeader>
    <nav className="gap-2 mt-4 flex flex-col">
      <SheetClose asChild>
        <Link href="/docs/components/sheet">Dashboard</Link>
      </SheetClose>
      <SheetClose asChild>
        <Link href="/docs/components/sheet">Settings</Link>
      </SheetClose>
    </nav>
  </SheetContent>
</Sheet>;

export function SheetSideDemo() {
  return null; // Update this with actual rendering logic
}
