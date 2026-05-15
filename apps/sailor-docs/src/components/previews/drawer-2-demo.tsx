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
export function Drawer2Demo() {
  return (
    <Drawer height={200}>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Compact</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Quick Filter</DrawerTitle>
          <DrawerDescription>Keep the action and Cancel visible above the fold.</DrawerDescription>
        </DrawerHeader>
        <DrawerBody />
        <DrawerFooter>
          <Button>Apply Filter</Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
