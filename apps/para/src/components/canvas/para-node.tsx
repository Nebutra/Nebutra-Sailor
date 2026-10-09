"use client";

import { Plus } from "@nebutra/icons";
import { Input } from "@nebutra/ui/primitives";
import { type Node as FlowNodeType, Handle, type NodeProps, Position } from "@xyflow/react";
import { type MouseEvent, useState } from "react";
import { nodeTitle } from "@/domain/nodes";
import type { WorkspaceNode } from "@/domain/types";
import { useEditorStore } from "@/stores/editor-store";
import { useUiStore } from "@/stores/ui-store";
import { MediaNode } from "./media-node";
import { NodeContextMenu } from "./node-context-menu";
import { NodeGlyph } from "./node-glyph";

export const PARA_NODE_TYPE = "para" as const;

export type ParaFlowNode = FlowNodeType<{ node: WorkspaceNode }, typeof PARA_NODE_TYPE>;

/**
 * One node on the canvas, drawn the way LibTV draws it: the type's icon and the node's name above
 * the frame ("首帧", "视频"), the frame itself, and a `+` port on each side that appears on hover or
 * selection. The right port is where the next step comes from — click it for the add-node menu, or
 * drag it onto another node to wire them; an image wired into a video node is its first frame.
 */
export function ParaNode({ data, selected, width, height }: NodeProps<ParaFlowNode>) {
  const node = data.node;
  const renameNode = useEditorStore((s) => s.renameNode);
  const openAddMenu = useUiStore((s) => s.openAddMenu);
  const [renaming, setRenaming] = useState(false);
  const title = nodeTitle(node);

  const addDownstream = (e: MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    openAddMenu({
      screen: { x: r.right + 8, y: r.top - 12 },
      flow: { x: node.x + node.width + 96, y: node.y },
      sourceId: node.id,
    });
  };

  const ports = selected ? "opacity-100" : "opacity-0 group-hover:opacity-100";

  return (
    <div
      className="para-node group relative"
      style={{ width: width ?? node.width, height: height ?? node.height }}
    >
      <div className="-top-7 absolute inset-x-0 flex h-5 items-center justify-between gap-2 text-label text-muted-foreground">
        {renaming ? (
          <Input
            size="sm"
            autoFocus
            aria-label="节点名称"
            defaultValue={node.title ?? ""}
            placeholder={title}
            className="nodrag h-6 w-40"
            onBlur={(e) => {
              renameNode(node.id, e.currentTarget.value);
              setRenaming(false);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setRenaming(false);
            }}
          />
        ) : (
          <span
            className="flex min-w-0 items-center gap-1.5"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setRenaming(true);
            }}
            title="双击重命名"
          >
            <NodeGlyph type={node.type} className="size-3.5 shrink-0" />
            <span className="truncate">{title}</span>
          </span>
        )}
        {selected && <NodeMeta node={node} />}
      </div>

      <NodeContextMenu nodeId={node.id}>
        <div className="h-full w-full">
          <MediaNode node={node} />
        </div>
      </NodeContextMenu>

      {selected && (
        <div
          aria-hidden="true"
          className="para-selected pointer-events-none absolute inset-0 rounded-[var(--para-node-radius)]"
        />
      )}

      <Handle
        type="target"
        position={Position.Left}
        style={{ left: -18 }}
        className={`para-port ${ports}`}
      >
        <Plus aria-hidden="true" className="pointer-events-none size-3" />
      </Handle>
      <Handle
        type="source"
        position={Position.Right}
        style={{ right: -18 }}
        className={`para-port ${ports}`}
        onClick={addDownstream}
        title="添加下游节点"
      >
        <Plus aria-hidden="true" className="pointer-events-none size-3" />
      </Handle>
    </div>
  );
}

/** The quiet fact on the right of a selected node's label: its shape, or its length. */
function NodeMeta({ node }: { node: WorkspaceNode }) {
  const p = node.generator?.params ?? {};
  const bits =
    node.type === "text"
      ? [node.text ? `${node.text.length} 字` : null]
      : [
          typeof p.aspect === "string" ? p.aspect : null,
          typeof p.resolution === "string" ? p.resolution : null,
          node.type === "video" && typeof p.duration === "number" ? `${p.duration}s` : null,
        ];
  const text = bits.filter(Boolean).join(" · ");
  return text ? <span className="shrink-0 text-meta tabular-nums">{text}</span> : null;
}
