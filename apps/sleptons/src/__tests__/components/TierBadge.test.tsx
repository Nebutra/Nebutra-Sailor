import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TierBadge } from "@/components/TierBadge";

describe("TierBadge", () => {
  it("renders v0 label for V0 tier", () => {
    render(<TierBadge tier="V0" />);
    expect(screen.getByText("v0")).toBeInTheDocument();
  });

  it("renders v∞ for V_INFINITY tier", () => {
    render(<TierBadge tier="V_INFINITY" />);
    expect(screen.getByText("v∞")).toBeInTheDocument();
  });

  it("applies correct color class for V2 tier", () => {
    const { container } = render(<TierBadge tier="V2" />);
    expect(container.firstChild).toHaveClass("bg-[var(--blue-3)]");
  });
});
