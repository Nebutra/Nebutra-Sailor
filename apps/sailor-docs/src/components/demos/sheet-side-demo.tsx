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

export function SheetSideDemo() {
  return (
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
        <nav className="flex flex-col gap-2 mt-4">
          <SheetClose asChild>
            <Link href="/docs/components/sheet">Dashboard</Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href="/docs/components/sheet">Settings</Link>
          </SheetClose>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
