import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "../resizable";

/**
 * jsdom has no layout, so every measurable box reports 1000x400. react-resizable-panels reads its
 * keyboard input from a native listener on the separator, so the tests press keys the same way.
 */
const realGetBoundingClientRect = Element.prototype.getBoundingClientRect;

function fakeLayout() {
  Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 1000,
      bottom: 400,
      width: 1000,
      height: 400,
      toJSON: () => ({}),
    } as DOMRect;
  };
  for (const key of ["offsetWidth", "clientWidth"] as const) {
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, value: 1000 });
  }
  for (const key of ["offsetHeight", "clientHeight"] as const) {
    Object.defineProperty(HTMLElement.prototype, key, { configurable: true, value: 400 });
  }
}

function renderGroup(dir: "ltr" | "rtl", orientation: "horizontal" | "vertical" = "horizontal") {
  fakeLayout();
  return render(
    <div dir={dir}>
      <ResizablePanelGroup orientation={orientation} id="g">
        <ResizablePanel id="a" defaultSize="50%">
          first
        </ResizablePanel>
        <ResizableHandle id="h" />
        <ResizablePanel id="b" defaultSize="50%">
          second
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>,
  );
}

function firstPanelSize(): number {
  return Number(screen.getByRole("separator").getAttribute("aria-valuenow"));
}

function press(key: string) {
  const separator = screen.getByRole("separator");
  separator.focus();
  fireEvent.keyDown(separator, { key });
}

afterEach(() => {
  Element.prototype.getBoundingClientRect = realGetBoundingClientRect;
  for (const key of ["offsetWidth", "clientWidth", "offsetHeight", "clientHeight"]) {
    Reflect.deleteProperty(HTMLElement.prototype, key);
  }
});

describe("ResizableHandle keyboard direction", () => {
  it("grows the first panel with ArrowRight in LTR (baseline)", () => {
    renderGroup("ltr");
    const before = firstPanelSize();
    press("ArrowRight");
    expect(firstPanelSize()).toBeGreaterThan(before);
  });

  it("grows the first panel with ArrowLeft in RTL", () => {
    renderGroup("rtl");
    const before = firstPanelSize();
    press("ArrowLeft");
    expect(firstPanelSize()).toBeGreaterThan(before);
  });

  it("shrinks the first panel with ArrowRight in RTL", () => {
    renderGroup("rtl");
    const before = firstPanelSize();
    press("ArrowRight");
    expect(firstPanelSize()).toBeLessThan(before);
  });

  it("leaves ArrowDown alone in a vertical group under RTL", () => {
    renderGroup("rtl", "vertical");
    const before = firstPanelSize();
    press("ArrowDown");
    expect(firstPanelSize()).toBeGreaterThan(before);
  });
});
