"use client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@nebutra/ui/primitives";
import { Search, User } from "lucide-react";

export function CommandDemo() {
  return (
    <Command className="w-96 h-[300px] rounded-lg border shadow-md">
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem></CommandItem>
          <CommandItem>
            <Search className="mr-2 h-4 w-4" />
            Search
            <>⌘K</>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem>
            <User className="mr-2 h-4 w-4" />
            Profile
            <>⌘P</>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}
