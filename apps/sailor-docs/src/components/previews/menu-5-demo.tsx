"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import { User } from "lucide-react";

export function Menu5Demo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-10 w-10 p-0 flex shrink-0 items-center justify-center rounded-full bg-muted text-foreground select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none">
        <User className="h-5 w-5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Preferences</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
