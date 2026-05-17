"use client";

/**
 * <NodeGraphCanvas> — generic interactive editor for any acyclic graph that
 * conforms to `@nebutra/graph-model` (`GraphNode` / `GraphEdge`).
 *
 * Domain-free: it imports NO feature package. The caller injects how to make
 * an edge from a connection (`makeEdge`), an edge's stable identity
 * (`edgeIdentity`), and how to present a node (`renderNode`). The reel
 * binding lives in `@nebutra/reel-canvas`. The graph is the single source of
 * truth; every gesture yields a *new* immutable graph (non-structural fields
 * preserved) through `onChange`. Cyclic connections are rejected via the
 * neutral `@nebutra/graph-model` guard.
 *
 * Chrome uses the shared `@lobehub/ui` `Button`; xyflow surfaces are themed
 * through xyflow CSS custom properties bound to Nebutra semantic tokens. The
 * custom node is intentionally not `Card`-wrapped (it owns its sizing + the
 * two connection `Handle`s) — see docs/capabilities/canvas/ANTI_PATTERNS.md.
 */

import type { Graph, GraphEdge, GraphNode } from "@nebutra/graph-model";
import { CrossSmall } from "@nebutra/icons";
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
import { Button } from "@lobehub/ui";
import { cva } from "class-variance-authority";
import { type CSSProperties, type ReactNode, useCallback, useId, useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { AnimateIn } from "./animate-in";
import {
  applyNodePositions,
  type EdgeIdentity,
  type FlowNode,
  GRAPH_NODE_FLOW_TYPE,
  graphToFlow,
  type MakeEdge,
  removeFlowEdge,
  removeNode,
  tryAddEdge,
} from "./node-graph-canvas-adapter";

/** Domain-supplied presentation for one node. */
export interface NodeView {
  readonly label: string;
  readonly subtitle?: string;
  readonly icon?: ReactNode;
  /** Drives the accent border (e.g. "has produced output"). */
  readonly ready?: boolean;
}

export interface NodeGraphCanvasProps<
  N extends GraphNode,
  E extends GraphEdge,
  G extends Graph<N, E>,
> {
  /** The graph to render. Treated as the single source of truth. */
  readonly graph: G;
  /** Called with a new immutable graph after every accepted mutation. */
  readonly onChange: (next: G) => void;
  /** Stable identity for an edge (also used for dedupe + removal). */
  readonly edgeIdentity: EdgeIdentity<E>;
  /** Build a domain edge from a connection, or veto it (return null). */
  readonly makeEdge: MakeEdge<E>;
  /** Map a node to its visual presentation. */
  readonly renderNode: (node: N) => NodeView;
  /** When true, the canvas is view/pan/zoom only — no edits. */
  readonly readOnly?: boolean;
  /** Optional extra class on the outer container. */
  readonly className?: string;
}

const XYFLOW_TOKEN_THEME: CSSProperties = {
  ["--xy-background-pattern-color" as string]: "var(--neutral-6)",
  ["--xy-edge-stroke" as string]: "var(--neutral-8)",
  ["--xy-connectionline-stroke" as string]: "var(--neutral-8)",
  ["--xy-handle-background-color" as string]: "var(--neutral-9)",
  ["--xy-handle-border-color" as string]: "var(--neutral-7)",
  ["--xy-controls-button-background-color" as string]: "var(--neutral-2)",
  ["--xy-controls-button-border-color" as string]: "var(--neutral-7)",
  ["--xy-controls-button-color" as string]: "var(--neutral-11)",
};

const nodeCardVariants = cva(
  "min-w-[160px] rounded-lg border bg-neutral-2 px-3 py-2 text-neutral-12 shadow-sm transition-colors",
  {
    variants: { ready: { true: "border-success", false: "border-neutral-7" } },
    defaultVariants: { ready: false },
  },
);

export function NodeGraphCanvas<N extends GraphNode, E extends GraphEdge, G extends Graph<N, E>>({
  graph,
  onChange,
  edgeIdentity,
  makeEdge,
  renderNode,
  readOnly = false,
  className,
}: NodeGraphCanvasProps<N, E, G>) {
  const statusId = useId();
  const [rejection, setRejection] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => graphToFlow(graph, edgeIdentity), [graph, edgeIdentity]);

  const nodeTypes = useMemo(
    () => ({
      [GRAPH_NODE_FLOW_TYPE]: ({ data }: { data: FlowNode<N>["data"] }) => {
        const view = renderNode(data.node);
        return (
          <div className={nodeCardVariants({ ready: view.ready ?? false })}>
            <Handle type="target" position={Position.Left} />
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-11 uppercase tracking-wide">
              {view.icon}
              {view.label}
            </div>
            {view.subtitle ? (
              <div className="mt-0.5 text-sm text-neutral-12">{view.subtitle}</div>
            ) : null}
            <Handle type="source" position={Position.Right} />
          </div>
        );
      },
    }),
    [renderNode],
  );

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
        const moved = nodes.map((n) => {
          const change = changes.find((c) => c.type === "position" && c.id === n.id);
          if (change && change.type === "position" && change.position) {
            return { ...n, position: change.position } as FlowNode<N>;
          }
          return n as FlowNode<N>;
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
      for (const r of removed) next = removeFlowEdge(next, r.id, edgeIdentity);
      onChange(next);
    },
    [graph, edgeIdentity, onChange, readOnly],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      const result = tryAddEdge(graph, connection, { makeEdge, edgeIdentity });
      if (result.ok) {
        setRejection(null);
        onChange(result.graph);
      } else {
        setRejection(result.reason);
      }
    },
    [graph, edgeIdentity, makeEdge, onChange, readOnly],
  );

  return (
    <AnimateIn preset="emerge">
      <div
        style={XYFLOW_TOKEN_THEME}
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
            <Background color="var(--neutral-6)" />
            <Controls showInteractive={!readOnly} />
            {rejection ? (
              <Panel position="top-center">
                <div
                  id={statusId}
                  role="alert"
                  aria-live="assertive"
                  className="flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <span>{rejection}</span>
                  <Button
                    size="small"
                    type="text"
                    icon={<CrossSmall size={14} />}
                    aria-label="Dismiss connection error"
                    onClick={() => setRejection(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </Panel>
            ) : null}
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </AnimateIn>
  );
}
