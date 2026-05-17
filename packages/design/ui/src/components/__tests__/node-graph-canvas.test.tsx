import type { Graph, GraphEdge, GraphNode } from "@nebutra/graph-model";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

/**
 * `@lobehub/ui` exposes only its full barrel (no `./Button` subpath), which
 * transitively pulls `@emoji-mart/data` JSON that the jsdom runner can't
 * import without an attribute. Production uses the real DS `Button`; this
 * mount-only smoke test stubs the barrel (behaviour is covered by the pure
 * generic adapter suite).
 */
vi.mock("@lobehub/ui", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    "aria-label"?: string;
  }) => (
    <button type="button" aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  ),
}));

import { NodeGraphCanvas } from "../node-graph-canvas";

interface TNode extends GraphNode {
  readonly label: string;
}
interface TEdge extends GraphEdge {
  readonly port: string;
}

const graph: Graph<TNode, TEdge> = {
  nodes: [
    { id: "a", x: 0, y: 0, label: "A" },
    { id: "b", x: 200, y: 0, label: "B" },
  ],
  edges: [{ from: "a", to: "b", port: "in" }],
};

const props = {
  graph,
  onChange: vi.fn(),
  edgeIdentity: (e: TEdge) => `${e.from}->${e.to}:${e.port}`,
  makeEdge: (from: string, to: string, h: string | null): TEdge => ({
    from,
    to,
    port: h ?? "in",
  }),
  renderNode: (n: TNode) => ({ label: n.label }),
};

describe("<NodeGraphCanvas> — smoke (generic)", () => {
  it("mounts a generic graph without throwing", () => {
    const { container } = render(<NodeGraphCanvas {...props} />);
    expect(container.querySelector(".react-flow")).not.toBeNull();
    expect(props.onChange).not.toHaveBeenCalled();
  });

  it("mounts in readOnly mode without throwing", () => {
    const { container } = render(<NodeGraphCanvas {...props} readOnly />);
    expect(container.querySelector(".react-flow")).not.toBeNull();
  });
});
