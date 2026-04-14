"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives";

export function Menu2Demo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Workspace</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-[220px]">
        <DropdownMenuItem>General</DropdownMenuItem>
        <DropdownMenuItem>Members</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Admin Settings</DropdownMenuLabel>
        <DropdownMenuItem>Billing &amp; Plans</DropdownMenuItem>
        <DropdownMenuItem>Security Logs</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
