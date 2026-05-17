import type { ReelGraph } from "@nebutra/reel";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

/**
 * `@lobehub/ui` exposes only its full barrel (no `./Button` subpath), which
 * transitively pulls `@emoji-mart/data` JSON that the jsdom test runner can't
 * import without an attribute. The component uses the real design-system
 * `Button` in prod/Storybook; for this mount-only smoke test we stub the
 * barrel with a minimal native button (behaviour is covered by the pure
 * adapter suite, not here).
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
