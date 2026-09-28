"use client";

import { Menu } from "@nebutra/icons";
import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@nebutra/ui/primitives";

const LINKS = ["Overview", "Projects", "Team", "Settings"];

export function SheetSideDemo() {
  return (
    <div className="flex justify-center p-10">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open navigation">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>Acme Inc</SheetTitle>
          </SheetHeader>
          <nav className="mt-4 flex flex-col gap-1">
            {LINKS.map((label) => (
              <SheetClose key={label} asChild>
                <Button variant="ghost" className="justify-start">
                  {label}
                </Button>
              </SheetClose>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
