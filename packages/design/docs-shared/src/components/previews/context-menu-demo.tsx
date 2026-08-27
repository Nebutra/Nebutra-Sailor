"use client";

import { ContextMenu } from "@nebutra/ui/primitives";

export function ContextMenuDemo() {
  return (
    <ContextMenu>
      <ContextMenu.Trigger asChild>
        <div className="flex h-[150px] w-[300px] items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border text-sm text-muted-foreground">
          Right-click here
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item value="open" onSelect={() => {}}>
          Open Deployment
        </ContextMenu.Item>
        <ContextMenu.Item value="copy" onSelect={() => {}}>
          Copy URL
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item value="delete" variant="destructive" onSelect={() => {}}>
          Delete Deployment
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}
