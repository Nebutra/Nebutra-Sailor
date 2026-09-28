"use client";

import type { Graph, GraphEdge, GraphNode } from "@nebutra/graph-model";
import { NodeGraphCanvas } from "@nebutra/ui/components";
import { useState } from "react";

interface StepNode extends GraphNode {
  readonly label: string;
  readonly done?: boolean;
}
interface StepEdge extends GraphEdge {
  readonly port: string;
}
type Pipeline = Graph<StepNode, StepEdge>;

const SEED: Pipeline = {
  nodes: [
    { id: "ingest", x: 0, y: 60, label: "Ingest events", done: true },
    { id: "enrich", x: 240, y: 0, label: "Enrich", done: true },
    { id: "score", x: 240, y: 140, label: "Score churn" },
    { id: "notify", x: 480, y: 60, label: "Notify CSM" },
  ],
  edges: [
    { from: "ingest", to: "enrich", port: "in" },
    { from: "ingest", to: "score", port: "in" },
    { from: "enrich", to: "notify", port: "in" },
    { from: "score", to: "notify", port: "in" },
  ],
};

const edgeIdentity = (e: StepEdge) => `${e.from}->${e.to}:${e.port}`;
const makeEdge = (from: string, to: string, handle: string | null): StepEdge => ({
  from,
  to,
  port: handle ?? "in",
});
const renderNode = (n: StepNode) => ({
  label: n.label,
  subtitle: n.done ? "done" : "pending",
  ready: n.done ?? false,
});

export function NodeGraphCanvasDemo() {
  const [graph, setGraph] = useState<Pipeline>(SEED);
  return (
    <div className="h-[28rem] w-full">
      <NodeGraphCanvas
        graph={graph}
        onChange={setGraph}
        edgeIdentity={edgeIdentity}
        makeEdge={makeEdge}
        renderNode={renderNode}
      />
    </div>
  );
}
