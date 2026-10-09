"use client";

// @async-surface-exempt: reads assets only to resolve the download URL of this node's output; a miss disables 下载.

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@nebutra/ui/primitives";
import type { ReactNode } from "react";
import { useAsset } from "@/mock/queries";
import { useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";

/** Right-click on a node, LibTV's vocabulary: 创建副本 / 删除 / 发送至 Agent / 下载. */
export function NodeContextMenu({ nodeId, children }: { nodeId: string; children: ReactNode }) {
  const select = useEditorStore((s) => s.select);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const node = useEditorStore((s) => s.document?.nodes[nodeId]);
  const setAgentOpen = useUiStore((s) => s.setAgentOpen);
  const setAgent = useUiStore((s) => s.setAgent);
  const addContextNode = useUiStore((s) => s.addContextNode);
  const asset = useAsset(node && node.type !== "text" ? node.assetId : undefined);

  return (
    <ContextMenuRoot onOpenChange={(open) => open && select([nodeId])}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="min-w-48">
        <ContextMenuItem onSelect={() => duplicateNode(nodeId)}>
          创建副本
          <ContextMenuShortcut>⌘D</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => {
            addContextNode(nodeId);
            setAgentOpen(true);
            setAgent({ status: "composing" });
          }}
        >
          发送至 Agent
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!asset?.url}
          onSelect={() => {
            if (asset?.url) window.open(asset.url, "_blank", "noopener,noreferrer");
          }}
        >
          下载
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem variant="destructive" onSelect={() => deleteNodes([nodeId])}>
          删除
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuRoot>
  );
}
