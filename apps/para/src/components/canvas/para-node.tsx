"use client";

import { type Node as FlowNodeType, Handle, type NodeProps, Position } from "@xyflow/react";
import type { WorkspaceNode } from "@/domain/types";
import { MediaNode } from "./media-node";

export const PARA_NODE_TYPE = "para" as const;

export type ParaFlowNode = FlowNodeType<{ node: WorkspaceNode }, typeof PARA_NODE_TYPE>;

/**
 * One node on the canvas. React Flow owns position, drag, selection and culling; everything
 * visible is `MediaNode`, so the visual language has exactly one home.
 *
 * The connection handles are deliberately invisible until hover: at rest a node is its media
 * (visual-language.md §4), and a permanent port dot is chrome the field does not draw.
 */
export function ParaNode({ data, selected, width, height }: NodeProps<ParaFlowNode>) {
  const node = data.node;
  return (
    <div
      className="para-node relative"
      style={{ width: width ?? node.width, height: height ?? node.height }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-neutral-7 !bg-neutral-9 opacity-0 transition-opacity group-hover:opacity-100"
      />
      <MediaNode node={node} selected={Boolean(selected)} />
      {selected && (
        <div
          aria-hidden="true"
          className="para-selected pointer-events-none absolute inset-0 rounded-[var(--para-node-radius)]"
        />
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-neutral-7 !bg-neutral-9 opacity-0 transition-opacity group-hover:opacity-100"
      />
    </div>
  );
}
