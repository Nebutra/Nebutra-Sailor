import type { ReelGraph } from "@nebutra/reel";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { NodeGraphCanvas } from "./node-graph-canvas";

const meta: Meta<typeof NodeGraphCanvas> = {
  title: "Patterns/NodeGraphCanvas",
  component: NodeGraphCanvas,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
};
export default meta;

type Story = StoryObj<typeof NodeGraphCanvas>;

const emptyGraph: ReelGraph = {
  id: "empty",
  tenantId: "org_demo",
  name: "Empty graph",
  nodes: [],
  edges: [],
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

const sampleDag: ReelGraph = {
  id: "sample",
  tenantId: "org_demo",
  name: "Sample DAG",
  nodes: [
    { id: "prompt", type: "text", x: 0, y: 120, settings: { text: "A cat" } },
    {
      id: "img",
      type: "gen-image",
      x: 280,
      y: 60,
      settings: { model: "demo" },
    },
    {
      id: "vid",
      type: "gen-video",
      x: 560,
      y: 60,
      settings: { seconds: 4 },
    },
    { id: "qa", type: "analyze", x: 840, y: 180, settings: {} },
  ],
  edges: [
    { from: "prompt", to: "img", inputType: "prompt" },
    { from: "img", to: "vid", inputType: "image" },
    { from: "vid", to: "qa", inputType: "video" },
  ],
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

/** Controlled wrapper so stories reflect real onChange round-trips. */
function Controlled({ initial, readOnly }: { initial: ReelGraph; readOnly?: boolean }) {
  const [graph, setGraph] = useState<ReelGraph>(initial);
  return <NodeGraphCanvas graph={graph} onChange={setGraph} readOnly={readOnly} />;
}

export const EmptyGraph: Story = {
  render: () => <Controlled initial={emptyGraph} />,
};

export const SampleDag: Story = {
  render: () => <Controlled initial={sampleDag} />,
};

export const ReadOnly: Story = {
  render: () => <Controlled initial={sampleDag} readOnly />,
};
