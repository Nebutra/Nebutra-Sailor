import type { ReelGraph } from "@nebutra/reel";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NodeGraphCanvas } from "../node-graph-canvas";

/**
 * Render smoke test. The behavioural contract is covered exhaustively by the
 * pure adapter suite; here we only assert the component mounts a reel graph
 * without throwing and without calling onChange on first paint.
 */

const graph: ReelGraph = {
  id: "smoke",
  tenantId: "org_1",
  name: "Smoke",
  nodes: [
    { id: "a", type: "text", x: 0, y: 0, settings: {} },
    { id: "b", type: "analyze", x: 200, y: 0, settings: {} },
  ],
  edges: [{ from: "a", to: "b", inputType: "context" }],
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("<NodeGraphCanvas> — smoke", () => {
  it("mounts a reel graph without throwing", () => {
    const onChange = vi.fn();
    const { container } = render(<NodeGraphCanvas graph={graph} onChange={onChange} />);
    expect(container.querySelector(".react-flow")).not.toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("mounts in readOnly mode without throwing", () => {
    const onChange = vi.fn();
    const { container } = render(<NodeGraphCanvas graph={graph} onChange={onChange} readOnly />);
    expect(container.querySelector(".react-flow")).not.toBeNull();
  });
});
