"use client";

import { Button } from "@nebutra/ui/primitives";

export function ButtonSizesDemo() {
  return (
    <div className="gap-4 flex flex-wrap items-center">
      <Button size="icon" className="h-6 px-2 text-xs">
        Tiny
      </Button>
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
    </div>
  );
}
