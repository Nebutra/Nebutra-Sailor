"use client";

import { Copy, Pencil as Edit2, Trash as Trash2 } from "@nebutra/icons";
import { ContextMenu } from "@nebutra/ui/primitives";

export function ContextMenuWithIconsDemo() {
  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className="text-sm flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed">
          Right-click here
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item onSelect={() => {}}>
          <Edit2 className="mr-2 h-4 w-4" />
          Edit
        </ContextMenu.Item>
        <ContextMenu.Item onSelect={() => {}}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item onSelect={() => {}}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
