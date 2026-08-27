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

export function DrawerDemo() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Filter Logs</DrawerTitle>
          <DrawerDescription>Choose the log types shown in this view.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody>
          <div className="grid gap-2">
            {["Errors", "Warnings", "Deployments"].map((option) => (
              <label
                key={option}
                className="flex items-center justify-between rounded-[var(--radius-md)] border bg-card px-3 py-2 text-sm"
              >
                <span>{option}</span>
                <input type="checkbox" className="size-4 accent-primary" />
              </label>
            ))}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button>Apply Filters</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
