import type { Graph, GraphEdge, GraphNode } from "@nebutra/graph-model";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { NodeGraphCanvas } from "./node-graph-canvas";

/**
 * Generic, domain-free node-graph editor. These stories use a tiny inline
 * graph type to show it depends on nothing but `@nebutra/graph-model`. The
 * reel-bound variant ships as `<ReelCanvas>` in `@nebutra/reel-canvas`.
 */

interface DemoNode extends GraphNode {
  readonly label: string;
  readonly done?: boolean;
}
interface DemoEdge extends GraphEdge {
  readonly port: string;
}
type DemoGraph = Graph<DemoNode, DemoEdge>;

const edgeIdentity = (e: DemoEdge) => `${e.from}->${e.to}:${e.port}`;
const makeEdge = (from: string, to: string, h: string | null): DemoEdge => ({
  from,
  to,
  port: h ?? "in",
});
const renderNode = (n: DemoNode) => ({
  label: n.label,
  subtitle: n.done ? "done" : "pending",
  ready: n.done,
});

const meta: Meta<typeof NodeGraphCanvas> = {
  title: "Patterns/NodeGraphCanvas",
  component: NodeGraphCanvas,
  tags: ["autodocs"],
};
export default meta;
type Story = StoryObj<typeof NodeGraphCanvas>;

function Editor({ seed, readOnly }: { seed: DemoGraph; readOnly?: boolean }) {
  const [graph, setGraph] = useState<DemoGraph>(seed);
  return (
    <NodeGraphCanvas
      graph={graph}
      onChange={setGraph}
      edgeIdentity={edgeIdentity}
      makeEdge={makeEdge}
      renderNode={renderNode}
      readOnly={readOnly}
    />
  );
}

const EMPTY: DemoGraph = { nodes: [], edges: [] };
const SAMPLE: DemoGraph = {
  nodes: [
    { id: "n1", x: 0, y: 40, label: "Source" },
    { id: "n2", x: 240, y: 0, label: "Transform", done: true },
    { id: "n3", x: 240, y: 140, label: "Sink" },
  ],
  edges: [
    { from: "n1", to: "n2", port: "in" },
    { from: "n2", to: "n3", port: "in" },
  ],
};

export const EmptyGraph: Story = { render: () => <Editor seed={EMPTY} /> };
export const SampleDag: Story = { render: () => <Editor seed={SAMPLE} /> };
export const ReadOnly: Story = { render: () => <Editor seed={SAMPLE} readOnly /> };
