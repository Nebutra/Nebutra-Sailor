"use client";

/**
 * <NodeGraphCanvas> — interactive editor for a `@nebutra/reel` graph.
 *
 * Controlled: it owns no graph state. Every gesture (drag, connect, delete)
 * is translated by the pure `node-graph-canvas-adapter` into a *new*
 * immutable `ReelGraph` and surfaced through `onChange`. Edge creation that
 * would make the graph cyclic is rejected via reel's own `hasCycleFrom`
 * guard and reported through an accessible inline status region.
 *
 * Design-system utilization: chrome uses the shared `Button` primitive
 * (re-exported by `@nebutra/ui/components` from @lobehub/ui) and Geist icons
 * from `@nebutra/icons`; xyflow surfaces are themed through xyflow's own
 * CSS custom properties bound to Nebutra semantic tokens (no `!important`
 * overrides). The custom xyflow node is intentionally NOT wrapped in the
 * heavy `Card` pattern: an xyflow node must own its sizing and the two
 * connection `Handle`s, which a Card wrapper would obscure — see
 * docs/capabilities/canvas/ANTI_PATTERNS.md.
 */

import {
  CrossSmall,
  Eye,
  FileText,
  Image as ImageIcon,
  Layers,
  Sparkles,
  Video,
} from "@nebutra/icons";
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
import { Button } from "@lobehub/ui";
import { cva } from "class-variance-authority";
import {
  type ComponentType,
  type CSSProperties,
  useCallback,
  useId,
  useMemo,
  useState,
} from "react";
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

/** Geist icon per reel node type — uses @nebutra/icons (product-surface default). */
const NODE_TYPE_ICON: Record<ReelNodeType, ComponentType<{ size?: number }>> = {
  text: FileText,
  image: ImageIcon,
  "gen-image": Sparkles,
  "gen-video": Video,
  storyboard: Layers,
  analyze: Eye,
};

/**
 * Bind xyflow's themeable surfaces to Nebutra semantic tokens via its
 * documented CSS custom properties (verified against @xyflow/react@12.10.2),
 * instead of fighting the default stylesheet with `!important`.
 */
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
  const TypeIcon = NODE_TYPE_ICON[reelType] ?? Layers;
  return (
    <div className={nodeCardVariants({ ready: data.hasOutput })}>
      <Handle type="target" position={Position.Left} />
      <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-11 uppercase tracking-wide">
        <TypeIcon size={13} />
        {NODE_TYPE_LABEL[reelType] ?? reelType}
      </div>
      <div className="mt-0.5 text-sm text-neutral-12">
        {data.hasOutput ? "Has output" : "Not run yet"}
      </div>
      <Handle type="source" position={Position.Right} />
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
