"use client";

import { Button, CommandMenu } from "@nebutra/ui/primitives";
import { useState } from "react";

export function CommandMenuDemo() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <div className="flex min-h-64 items-center justify-center">
      <Button onClick={() => setOpen(true)}>Open Command Menu</Button>
      <CommandMenu.Root
        open={open}
        setOpen={setOpen}
        description="Search commands and run global product actions."
      >
        <CommandMenu.Input placeholder="What do you need?" />
        <CommandMenu.Results count={4} />
        <CommandMenu.List>
          <CommandMenu.Group heading="Project">
            <CommandMenu.Item value="deploy-project" onSelect={close}>
              Deploy Project
            </CommandMenu.Item>
            <CommandMenu.Item value="invite-member" onSelect={close}>
              Invite Team Member
            </CommandMenu.Item>
          </CommandMenu.Group>
          <CommandMenu.Group heading="System">
            <CommandMenu.Item value="open-audit-log" onSelect={close}>
              Open Audit Log
            </CommandMenu.Item>
            <CommandMenu.Item disabled value="rotate-secrets" onSelect={close}>
              Rotate Secrets
            </CommandMenu.Item>
          </CommandMenu.Group>
        </CommandMenu.List>
      </CommandMenu.Root>
    </div>
  );
}
