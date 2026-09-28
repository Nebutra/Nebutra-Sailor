"use client";

import { Button, CommandMenu } from "@nebutra/ui/primitives";
import { useState } from "react";

const GROUPS = [
  { heading: "Projects", items: ["Open acme-web", "Open billing-api", "Create project"] },
  { heading: "Team", items: ["Invite a member", "Manage roles"] },
  { heading: "Account", items: ["Billing settings", "Sign out"] },
];

export function CommandMenuDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex justify-center p-10">
      <Button variant="outline" onClick={() => setOpen(true)}>
        Search commands
      </Button>
      <CommandMenu.Root
        open={open}
        setOpen={setOpen}
        description="Search commands and run actions."
      >
        <CommandMenu.Input placeholder="What do you need?" />
        <CommandMenu.List>
          <CommandMenu.Empty>No commands found.</CommandMenu.Empty>
          {GROUPS.map((group, index) => (
            <CommandMenu.Group key={group.heading} heading={group.heading}>
              {index > 0 ? <CommandMenu.Separator /> : null}
              {group.items.map((item) => (
                <CommandMenu.Item key={item} value={item} onSelect={() => setOpen(false)}>
                  {item}
                </CommandMenu.Item>
              ))}
            </CommandMenu.Group>
          ))}
        </CommandMenu.List>
      </CommandMenu.Root>
    </div>
  );
}
