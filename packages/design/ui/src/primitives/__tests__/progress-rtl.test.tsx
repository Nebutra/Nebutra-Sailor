import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "../progress";

function renderRtl(ui: React.ReactElement) {
  return render(<div dir="rtl">{ui}</div>);
}

describe("Progress fill direction", () => {
  it("grows the fill from the inline start, not from a hard-coded left edge", () => {
    const { container } = renderRtl(<Progress aria-label="Upload" value={40} />);
    const fill = container.querySelector<HTMLElement>("[data-progress-fill], [style*=scale]");
    expect(fill).not.toBeNull();
    expect(fill?.style.transformOrigin ?? "").not.toMatch(/left/);
    expect(fill?.className).toMatch(/origin-left/);
    expect(fill?.className).toMatch(/rtl:origin-right/);
  });

  it("places stop markers on the inline start edge", () => {
    const { container } = renderRtl(
      <Progress aria-label="Build" stops={[{ value: 25, ariaLabel: "Lint" }]} value={50} />,
    );
    const marker = Array.from(container.querySelectorAll<HTMLElement>("span")).find((el) =>
      el.textContent?.includes("Lint"),
    );
    expect(marker).toBeDefined();
    expect(marker?.style.left).toBe("");
    expect(marker?.getAttribute("style") ?? "").toMatch(/inset-inline-start:\s*25%/);
    expect(marker?.className).toMatch(/rtl:translate-x-1\/2/);
  });
});
