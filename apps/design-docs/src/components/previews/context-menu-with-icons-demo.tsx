"use client";

import { Copy, Pencil as Edit2, Trash as Trash2 } from "@nebutra/icons";
import { ContextMenu } from "@nebutra/ui/primitives";

export function ContextMenuWithIconsDemo() {
  return (
    <ContextMenu>
      <ContextMenu.Trigger asChild>
        <div className="flex h-[150px] w-[300px] items-center justify-center rounded-[var(--radius-md)] border border-dashed border-border text-sm text-muted-foreground">
          Right-click here
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        <ContextMenu.Item prefix={<Edit2 className="size-4" />} value="rename" onSelect={() => {}}>
          Rename Deployment...
        </ContextMenu.Item>
        <ContextMenu.Item prefix={<Copy className="size-4" />} value="copy" onSelect={() => {}}>
          Copy URL
          <ContextMenu.Shortcut>⌘C</ContextMenu.Shortcut>
        </ContextMenu.Item>
        <ContextMenu.Separator />
        <ContextMenu.Item
          prefix={<Trash2 className="size-4" />}
          value="delete"
          variant="destructive"
          onSelect={() => {}}
        >
          Delete Deployment
        </ContextMenu.Item>
      </ContextMenu.Content>
    </ContextMenu>
  );
}
