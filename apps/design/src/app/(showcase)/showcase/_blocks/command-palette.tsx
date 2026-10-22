"use client";

import { Layers, MagnifyingGlass, Plus, SettingsGear } from "@nebutra/icons";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Kbd,
} from "@nebutra/ui/primitives";
import { useState } from "react";

/** Filtering, arrow-key movement and Enter come from Command; this block only supplies the groups and what Enter does. */
export function CommandPaletteBlock() {
  const [ran, setRan] = useState<string | null>(null);

  const run = (label: string) => () => setRan(label);

  return (
    <div className="flex w-full max-w-lg flex-col gap-3">
      <Command className="rounded-[var(--radius-lg)] border border-border shadow-md">
        <CommandInput placeholder="Type a command or search…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Go to">
            <CommandItem onSelect={run("Go to Deployments")}>
              <Layers aria-hidden="true" className="me-2 size-4" />
              Deployments
              <Kbd className="ms-auto" small>
                G D
              </Kbd>
            </CommandItem>
            <CommandItem onSelect={run("Go to Settings")}>
              <SettingsGear aria-hidden="true" className="me-2 size-4" />
              Settings
              <Kbd className="ms-auto" small>
                G S
              </Kbd>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem onSelect={run("New project")}>
              <Plus aria-hidden="true" className="me-2 size-4" />
              New project
              <Kbd className="ms-auto" small>
                N
              </Kbd>
            </CommandItem>
            <CommandItem onSelect={run("Search docs")}>
              <MagnifyingGlass aria-hidden="true" className="me-2 size-4" />
              Search docs
              <Kbd className="ms-auto" small>
                /
              </Kbd>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <p aria-live="polite" className="text-muted-foreground text-xs">
        {ran ? `Ran: ${ran}` : "Arrow keys to move, Enter to run."}
      </p>
    </div>
  );
}
