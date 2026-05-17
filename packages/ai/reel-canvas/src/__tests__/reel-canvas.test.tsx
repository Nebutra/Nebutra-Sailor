import type { ReelGraph, ReelNode } from "@nebutra/reel";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * Stub the generic editor: we only verify the reel BINDING wiring (identity,
 * makeEdge, renderNode, onChange→updatedAt). The generic editor's own
 * behaviour is covered in @nebutra/ui; @lobehub/ui's heavy barrel never loads.
 */
const captured: { props?: Record<string, unknown> } = {};
vi.mock("@nebutra/ui/components", () => ({
  NodeGraphCanvas: (props: Record<string, unknown>) => {
    captured.props = props;
    return <div data-testid="generic-canvas" />;
  },
}));

import { ReelCanvas } from "../reel-canvas";

const graph: ReelGraph = {
  id: "g",
  tenantId: "org_1",
  name: "G",
  nodes: [
    { id: "a", type: "text", x: 0, y: 0, settings: {} },
    { id: "b", type: "gen-image", x: 10, y: 10, settings: {}, output: undefined },
  ],
  edges: [],
  updatedAt: new Date("2020-01-01T00:00:00.000Z"),
};

describe("<ReelCanvas>", () => {
  it("renders the generic editor and injects the reel binding", () => {
    const onChange = vi.fn();
    const { getByTestId } = render(<ReelCanvas graph={graph} onChange={onChange} />);
    expect(getByTestId("generic-canvas")).toBeDefined();

    const p = captured.props ?? {};
    expect(p.graph).toBe(graph);
    expect(typeof p.edgeIdentity).toBe("function");
    expect(typeof p.makeEdge).toBe("function");
    expect(typeof p.renderNode).toBe("function");
  });

  it("renderNode maps a reel node to label + icon + ready", () => {
    render(<ReelCanvas graph={graph} onChange={vi.fn()} />);
    const renderNode = captured.props?.renderNode as (n: ReelNode) => {
      label: string;
      ready?: boolean;
      icon?: unknown;
    };
    const ran: ReelNode = {
      id: "x",
      type: "analyze",
      x: 0,
      y: 0,
      settings: {},
      output: {
        version: "1.0",
        kind: "text",
        text: ["ok"],
        media: [],
        meta: { sourceNodeId: "x", sourceNodeType: "analyze", inputType: "input" },
      },
    };
    const view = renderNode(ran);
    expect(view.label).toBe("Analyze");
    expect(view.ready).toBe(true);
    expect(view.icon).toBeDefined();
  });

  it("onChange re-stamps updatedAt before bubbling up", () => {
    const onChange = vi.fn();
    render(<ReelCanvas graph={graph} onChange={onChange} />);
    const wrapped = captured.props?.onChange as (g: ReelGraph) => void;
    wrapped({ ...graph, name: "edited" });
    expect(onChange).toHaveBeenCalledTimes(1);
    const passed = onChange.mock.calls[0]?.[0] as ReelGraph;
    expect(passed.name).toBe("edited");
    expect(passed.updatedAt.getTime()).toBeGreaterThan(graph.updatedAt.getTime());
  });
});
