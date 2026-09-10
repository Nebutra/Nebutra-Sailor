"use client";

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@nebutra/ui/primitives";
import type { ReactNode } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";

/** Right-click (A for the structural items; "Send to PARA" B — Lovart 发送至对话). */
export function NodeContextMenu({ nodeId, children }: { nodeId: string; children: ReactNode }) {
  const select = useEditorStore((s) => s.select);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const setDrawer = useUiStore((s) => s.setDrawer);
  const setAgent = useUiStore((s) => s.setAgent);
  const addContextNode = useUiStore((s) => s.addContextNode);

  return (
    <ContextMenuRoot onOpenChange={(open) => open && select([nodeId])}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem disabled>Copy</ContextMenuItem>
        <ContextMenuItem onSelect={() => duplicateNode(nodeId)}>Duplicate</ContextMenuItem>
        <ContextMenuItem disabled>Paste</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={() => {
            addContextNode(nodeId);
            setDrawer("agent");
            setAgent({ status: "composing" });
          }}
        >
          Send to PARA
        </ContextMenuItem>
        <ContextMenuItem disabled>Download</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => deleteNodes([nodeId])}>
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuRoot>
  );
}
