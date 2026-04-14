"use client";

import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@nebutra/ui/primitives";

export function DrawerSideRightDemo() {
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button>打开侧边栏 (Open Sidebar)</Button>
      </DrawerTrigger>
      <DrawerContent className="w-80 p-4 mt-0 mr-0 mb-0 ml-auto h-full">
        <DrawerHeader>
          <DrawerTitle>导航 (Navigation)</DrawerTitle>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  );
}
