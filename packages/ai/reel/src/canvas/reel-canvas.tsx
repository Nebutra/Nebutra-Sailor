"use client";

/**
 * <ReelCanvas> — the reel-bound node-graph editor.
 *
 * A thin composition over the generic `@nebutra/ui` `NodeGraphCanvas`: it
 * supplies the reel-specific edge identity, edge creation, and node
 * presentation (Geist icons per reel node type), and re-stamps `updatedAt`
 * on every accepted mutation. The dependency direction is correct:
 * reel-canvas → (ui, reel); ui depends on neither.
 */

import { Eye, FileText, Image as ImageIcon, Layers, Sparkles, Video } from "@nebutra/icons";
import type { ReelGraph, ReelNode, ReelNodeType } from "@nebutra/reel";
import { NodeGraphCanvas, type NodeView } from "@nebutra/ui/components";
import type { ComponentType } from "react";
import { REEL_NODE_LABEL, reelEdgeIdentity, reelMakeEdge, withReelTimestamp } from "./binding";

const REEL_NODE_ICON: Record<ReelNodeType, ComponentType<{ size?: number }>> = {
  text: FileText,
  image: ImageIcon,
  "gen-image": Sparkles,
  "gen-video": Video,
  storyboard: Layers,
  analyze: Eye,
};

function reelRenderNode(node: ReelNode): NodeView {
  const Icon = REEL_NODE_ICON[node.type] ?? Layers;
  return {
    label: REEL_NODE_LABEL[node.type] ?? node.type,
    subtitle: node.output !== undefined ? "Has output" : "Not run yet",
    icon: <Icon size={13} />,
    ready: node.output !== undefined,
  };
}

export interface ReelCanvasProps {
  /** The reel graph to render — the single source of truth. */
  readonly graph: ReelGraph;
  /** Receives a new immutable ReelGraph (updatedAt re-stamped) per mutation. */
  readonly onChange: (next: ReelGraph) => void;
  readonly readOnly?: boolean;
  readonly className?: string;
}

export function ReelCanvas({ graph, onChange, readOnly, className }: ReelCanvasProps) {
  return (
    <NodeGraphCanvas
      graph={graph}
      onChange={(next: ReelGraph) => onChange(withReelTimestamp(next))}
      edgeIdentity={reelEdgeIdentity}
      makeEdge={reelMakeEdge}
      renderNode={reelRenderNode}
      {...(readOnly !== undefined ? { readOnly } : {})}
      {...(className !== undefined ? { className } : {})}
    />
  );
}
