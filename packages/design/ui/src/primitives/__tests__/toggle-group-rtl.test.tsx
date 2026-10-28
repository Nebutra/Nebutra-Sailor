import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToggleGroup, ToggleGroupItem } from "../toggle-group";

function renderGroup(dir: "ltr" | "rtl") {
  render(
    <div dir={dir}>
      <ToggleGroup aria-label="Align" defaultValue="b" type="single">
        <ToggleGroupItem value="a">A</ToggleGroupItem>
        <ToggleGroupItem value="b">B</ToggleGroupItem>
        <ToggleGroupItem value="c">C</ToggleGroupItem>
      </ToggleGroup>
    </div>,
  );
  const middle = screen.getByRole("radio", { name: "B" });
  middle.focus();
  return middle;
}

function checked() {
  return screen.getByRole("radio", { checked: true }).textContent;
}

describe("ToggleGroup arrow keys", () => {
  it("ArrowRight moves to the next item in LTR (baseline)", () => {
    const middle = renderGroup("ltr");
    fireEvent.keyDown(middle, { key: "ArrowRight" });
    expect(checked()).toBe("C");
  });

  it("ArrowLeft moves to the next item in RTL", () => {
    const middle = renderGroup("rtl");
    fireEvent.keyDown(middle, { key: "ArrowLeft" });
    expect(checked()).toBe("C");
  });

  it("ArrowRight moves to the previous item in RTL", () => {
    const middle = renderGroup("rtl");
    fireEvent.keyDown(middle, { key: "ArrowRight" });
    expect(checked()).toBe("A");
  });

  it("keeps ArrowDown as next and ArrowUp as previous in RTL", () => {
    const middle = renderGroup("rtl");
    fireEvent.keyDown(middle, { key: "ArrowDown" });
    expect(checked()).toBe("C");
    fireEvent.keyDown(screen.getByRole("radio", { name: "C" }), { key: "ArrowUp" });
    expect(checked()).toBe("B");
  });
});
