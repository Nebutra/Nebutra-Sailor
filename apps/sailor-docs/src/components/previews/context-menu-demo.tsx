"use client";

import { ContextMenu } from "@nebutra/ui/primitives";

export function ContextMenuDemo() {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className="text-sm flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed">
          Right-click here
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onSelect={() => {}}>Edit</ContextMenu.Item>
        <ContextMenu.Item onSelect={() => {}}>Duplicate</ContextMenu.Item>
        <ContextMenu.Item onSelect={() => {}}>Delete</ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
