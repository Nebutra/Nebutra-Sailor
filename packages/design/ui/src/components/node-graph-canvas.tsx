"use client";

/**
 * <NodeGraphCanvas> — interactive editor for a `@nebutra/reel` graph.
 *
 * Controlled: it owns no graph state. Every gesture (drag, connect, delete)
 * is translated by the pure `node-graph-canvas-adapter` into a *new*
 * immutable `ReelGraph` and surfaced through `onChange`. Edge creation that
 * would make the graph cyclic is rejected via reel's own `hasCycleFrom`
 * guard and reported through an accessible inline status region.
 */

import type { ReelGraph, ReelNodeType } from "@nebutra/reel";
import {
  Background,
  type Connection,
  Controls,
  type Edge,
  type EdgeChange,
  Handle,
  type Node,
  type NodeChange,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cva } from "class-variance-authority";
import { useCallback, useId, useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { AnimateIn } from "./animate-in";
import {
  applyNodePositions,
  type FlowNode,
  REEL_NODE_FLOW_TYPE,
  reelToFlow,
  removeFlowEdge,
  removeNode,
  tryAddEdge,
} from "./node-graph-canvas-adapter";

export interface NodeGraphCanvasProps {
  /** The reel graph to render. Treated as the single source of truth. */
  readonly graph: ReelGraph;
  /** Called with a new immutable graph after every accepted mutation. */
  readonly onChange: (next: ReelGraph) => void;
  /** When true, the canvas is view/pan/zoom only — no edits. */
  readonly readOnly?: boolean;
  /** Optional extra class on the outer container. */
  readonly className?: string;
}

const NODE_TYPE_LABEL: Record<ReelNodeType, string> = {
  text: "Text",
  image: "Image",
  "gen-image": "Generate Image",
  "gen-video": "Generate Video",
  storyboard: "Storyboard",
  analyze: "Analyze",
};

const nodeCardVariants = cva(
  "min-w-[160px] rounded-lg border bg-neutral-2 px-3 py-2 text-neutral-12 shadow-sm transition-colors",
  {
    variants: {
      ready: {
        true: "border-success",
        false: "border-neutral-7",
      },
    },
    defaultVariants: { ready: false },
  },
);

/** Single custom node renderer for every reel node type. */
function ReelFlowNode({ data }: { data: FlowNode["data"] }) {
  const reelType = data.reelType as ReelNodeType;
  return (
    <div className={nodeCardVariants({ ready: data.hasOutput })}>
      <Handle type="target" position={Position.Left} className="!bg-neutral-9" />
      <div className="text-xs font-medium text-neutral-11 uppercase tracking-wide">
        {NODE_TYPE_LABEL[reelType] ?? reelType}
      </div>
      <div className="mt-0.5 text-sm text-neutral-12">
        {data.hasOutput ? "Has output" : "Not run yet"}
      </div>
      <Handle type="source" position={Position.Right} className="!bg-neutral-9" />
    </div>
  );
}

const nodeTypes = { [REEL_NODE_FLOW_TYPE]: ReelFlowNode } as const;

export function NodeGraphCanvas({
  graph,
  onChange,
  readOnly = false,
  className,
}: NodeGraphCanvasProps) {
  const statusId = useId();
  const [rejection, setRejection] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => reelToFlow(graph), [graph]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (readOnly) return;
      const removed = changes.filter(
        (c): c is NodeChange & { type: "remove"; id: string } => c.type === "remove",
      );
      if (removed.length > 0) {
        let next = graph;
        for (const r of removed) next = removeNode(next, r.id);
        onChange(next);
        return;
      }
      const positional = changes.some((c) => c.type === "position" && c.dragging === false);
      if (positional) {
        // Reconcile xyflow's just-finished drag back into the reel graph.
        const moved = nodes.map((n) => {
          const change = changes.find((c) => c.type === "position" && c.id === n.id);
          if (change && change.type === "position" && change.position) {
            return { ...n, position: change.position } as FlowNode;
          }
          return n as FlowNode;
        });
        onChange(applyNodePositions(graph, moved));
      }
    },
    [graph, nodes, onChange, readOnly],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return;
      const removed = changes.filter(
        (c): c is EdgeChange & { type: "remove"; id: string } => c.type === "remove",
      );
      if (removed.length === 0) return;
      let next = graph;
      for (const r of removed) next = removeFlowEdge(next, r.id);
      onChange(next);
    },
    [graph, onChange, readOnly],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      const result = tryAddEdge(graph, connection);
      if (result.ok) {
        setRejection(null);
        onChange(result.graph);
      } else {
        setRejection(result.reason);
      }
    },
    [graph, onChange, readOnly],
  );

  return (
    <AnimateIn preset="emerge">
      <div
        className={cn(
          "relative h-[480px] w-full overflow-hidden rounded-xl border border-neutral-7 bg-neutral-1",
          className,
        )}
      >
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes as Node[]}
            edges={edges as Edge[]}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background className="!bg-neutral-1" color="var(--neutral-6)" />
            <Controls showInteractive={!readOnly} className="!border-neutral-7 !bg-neutral-2" />
            {rejection ? (
              <Panel position="top-center">
                <div
                  id={statusId}
                  role="alert"
                  aria-live="assertive"
                  className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {rejection}
                  <button
                    type="button"
                    aria-label="Dismiss connection error"
                    onClick={() => setRejection(null)}
                    className="ml-3 rounded px-1 text-destructive underline"
                  >
                    Dismiss
                  </button>
                </div>
              </Panel>
            ) : null}
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </AnimateIn>
  );
}
