"use client";

import {
  BaseButton as Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@nebutra/ui/primitives";
import * as React from "react";

export function PopoverControlledDemo() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(true);
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button>Toggle Popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="mb-4 text-sm">Controlled popover content</p>
        <Button variant="outline" size="sm">
          Close
        </Button>
      </PopoverContent>
    </Popover>
  );
}
