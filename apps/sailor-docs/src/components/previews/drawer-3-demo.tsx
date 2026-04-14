"use client";

import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@nebutra/ui/primitives";
export function Drawer3Demo() {
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button>Open Sidebar</Button>
      </DrawerTrigger>
      <DrawerContent className="w-80 p-4 mt-0 mr-0 mb-0 ml-auto h-full">
        <DrawerHeader>
          <DrawerTitle>Navigation</DrawerTitle>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  );
}
