"use client";

import type { ReelGraph } from "@nebutra/reel";
import { ReelCanvas } from "@nebutra/reel-canvas";
import { useState } from "react";

/**
 * Client island for the `canvas` capability demo. Owns a single in-memory
 * ReelGraph and feeds the controlled <NodeGraphCanvas>. No persistence, no
 * tenant writes — purely demonstrates the reel model + interactive editor.
 */

const SEED: ReelGraph = {
  id: "demo-graph",
  tenantId: "demo-tenant",
  name: "Canvas demo",
  nodes: [
    { id: "n1", type: "text", x: 0, y: 40, settings: {} },
    { id: "n2", type: "gen-image", x: 260, y: 0, settings: {} },
    { id: "n3", type: "analyze", x: 260, y: 140, settings: {} },
    { id: "n4", type: "storyboard", x: 520, y: 70, settings: {} },
  ],
  edges: [
    { from: "n1", to: "n2", inputType: "prompt" },
    { from: "n1", to: "n3", inputType: "context" },
    { from: "n2", to: "n4", inputType: "frames" },
  ],
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

export function CanvasDemoClient() {
  const [graph, setGraph] = useState<ReelGraph>(SEED);

  return (
    <div className="flex flex-col gap-4">
      <ReelCanvas graph={graph} onChange={setGraph} />
      <p className="text-[color:var(--neutral-11)] text-sm">
        Drag nodes, connect handles (cycles are rejected), delete to mutate. Live graph:{" "}
        <code>{graph.nodes.length}</code> nodes, <code>{graph.edges.length}</code> edges.
      </p>
    </div>
  );
}
