"use client";

import {
  Button,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@nebutra/ui/primitives";
import * as React from "react";

export function CommandDialogSimpleDemo() {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="flex justify-center p-10">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open command palette
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Pages">
            <CommandItem onSelect={() => setOpen(false)}>Dashboard</CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>Billing</CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>Settings</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
