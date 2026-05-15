"use client";

import {
  Button,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@nebutra/ui/primitives";
export function Drawer3Demo() {
  return (
    <Drawer height="70vh">
      <DrawerTrigger asChild>
        <Button variant="outline">Open Scrollable</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Notification Rules</DrawerTitle>
          <DrawerDescription>Review the rules before applying changes.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <div className="grid gap-2">
            {Array.from({ length: 12 }, (_, index) => (
              <div
                key={index}
                className="rounded-[var(--radius-md)] border bg-card px-3 py-2 text-sm text-muted-foreground"
              >
                Rule {index + 1}: notify the owner when this condition matches.
              </div>
            ))}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button>Save Rules</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
