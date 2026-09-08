"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";
import Link from "next/link";

export function ProfileButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Account"
          className="ml-1 flex size-7 items-center justify-center rounded-full bg-neutral-4 font-medium text-foreground text-xs hover:bg-neutral-5"
        >
          M
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuItem render={<Link href="/" />}>Home</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/projects" />}>Projects</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>Settings</DropdownMenuItem>
        <DropdownMenuItem disabled>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
