import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Scroller } from "../scroller";

const VIEWPORT_WIDTH = 300;
const CHILD_WIDTH = 100;
const CHILD_COUNT = 8;

type Mocked = { viewport: HTMLElement; scrollTo: ReturnType<typeof vi.fn> };

/**
 * jsdom has no layout, so the viewport geometry is faked the way a browser reports it: in RTL the
 * content starts at the right edge, `scrollLeft` is 0 there and goes negative towards the end,
 * and a child's on-screen x shifts by `-scrollLeft`.
 */
function mockGeometry(rtl: boolean, scrollLeft: number): Mocked {
  const viewport = screen.getByRole("region", { name: "content" });
  const scrollTo = vi.fn();
  Object.defineProperty(viewport, "scrollWidth", {
    configurable: true,
    value: CHILD_WIDTH * CHILD_COUNT,
  });
  Object.defineProperty(viewport, "clientWidth", { configurable: true, value: VIEWPORT_WIDTH });
  Object.defineProperty(viewport, "scrollLeft", {
    configurable: true,
    writable: true,
    value: scrollLeft,
  });
  viewport.scrollTo = scrollTo as unknown as typeof viewport.scrollTo;
  viewport.getBoundingClientRect = () =>
    ({
      left: 0,
      right: VIEWPORT_WIDTH,
      top: 0,
      bottom: 40,
      width: VIEWPORT_WIDTH,
      height: 40,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }) as DOMRect;

  const items = screen.getAllByTestId("item");
  items.forEach((item, index) => {
    item.getBoundingClientRect = () => {
      const current = (viewport as unknown as { scrollLeft: number }).scrollLeft;
      const left = rtl
        ? VIEWPORT_WIDTH - CHILD_WIDTH * (index + 1) - current
        : CHILD_WIDTH * index - current;
      return {
        left,
        right: left + CHILD_WIDTH,
        top: 0,
        bottom: 40,
        width: CHILD_WIDTH,
        height: 40,
        x: left,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect;
    };
  });
  fireEvent.scroll(viewport);
  return { viewport, scrollTo };
}

function renderScroller(
  dir: "ltr" | "rtl",
  props: Partial<React.ComponentProps<typeof Scroller>> = {},
) {
  return render(
    <div dir={dir}>
      <Scroller overflow="x" withButtons {...props}>
        {Array.from({ length: CHILD_COUNT }, (_, index) => (
          <div key={index} data-testid="item">
            item {index}
          </div>
        ))}
      </Scroller>
    </div>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Scroller under dir=rtl", () => {
  it("treats a negative scrollLeft as progress towards the end, not as the start edge", () => {
    renderScroller("rtl");
    mockGeometry(true, -200);

    expect(screen.getByRole("button", { name: "Scroll content right" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Scroll content left" })).toBeEnabled();
  });

  it("disables the next button at the far (left) end of an RTL scroller", () => {
    renderScroller("rtl");
    mockGeometry(true, -(CHILD_WIDTH * CHILD_COUNT - VIEWPORT_WIDTH));

    expect(screen.getByRole("button", { name: "Scroll content left" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Scroll content right" })).toBeEnabled();
  });

  it("disables the previous button at the start (right) edge of an RTL scroller", () => {
    renderScroller("rtl");
    mockGeometry(true, 0);

    expect(screen.getByRole("button", { name: "Scroll content right" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Scroll content left" })).toBeEnabled();
  });

  it("names the buttons by the physical side they scroll towards", () => {
    renderScroller("rtl");
    expect(screen.getByRole("button", { name: "Scroll content right" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scroll content left" })).toBeInTheDocument();
  });

  it("steps to the next child with a negative scrollLeft target", () => {
    renderScroller("rtl");
    const { scrollTo } = mockGeometry(true, 0);

    fireEvent.click(screen.getByRole("button", { name: "Scroll content left" }));

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo.mock.calls[0]?.[0]).toMatchObject({ left: -CHILD_WIDTH });
  });

  it("steps back towards the start from the middle of an RTL scroller", () => {
    renderScroller("rtl");
    const { scrollTo } = mockGeometry(true, -200);

    fireEvent.click(screen.getByRole("button", { name: "Scroll content right" }));

    expect(scrollTo.mock.calls[0]?.[0]).toMatchObject({ left: -100 });
  });

  it("mirrors the fade gradients so they still fade towards the inside", () => {
    const { container } = renderScroller("rtl");
    mockGeometry(true, -200);

    const root = container.querySelector<HTMLElement>("div.relative.isolate");
    expect(root?.className).toContain("rtl:before:bg-gradient-to-l");
    expect(root?.className).toContain("rtl:after:bg-gradient-to-r");
  });

  it("mirrors the chevrons", () => {
    renderScroller("rtl");
    for (const button of screen.getAllByRole("button")) {
      expect(button.querySelector("svg")?.getAttribute("class")).toContain("rtl:rotate-180");
    }
  });

  it("keeps LTR behaviour: scrollLeft 0 means previous is disabled, next steps forward", () => {
    renderScroller("ltr");
    const { scrollTo } = mockGeometry(false, 0);

    expect(screen.getByRole("button", { name: "Scroll content left" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Scroll content right" }));
    expect(scrollTo.mock.calls[0]?.[0]).toMatchObject({ left: CHILD_WIDTH });
  });
});

describe("Scroller reduced motion", () => {
  function stubReducedMotion(matches: boolean) {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: matches && query.includes("prefers-reduced-motion"),
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }) as unknown as MediaQueryList,
    );
  }

  it("downgrades the button smooth scroll to an instant jump", () => {
    stubReducedMotion(true);
    renderScroller("ltr");
    const { scrollTo } = mockGeometry(false, 0);

    fireEvent.click(screen.getByRole("button", { name: "Scroll content right" }));

    expect(scrollTo.mock.calls[0]?.[0]).toMatchObject({ behavior: "auto" });
  });

  it("keeps smooth scrolling when motion is allowed", () => {
    stubReducedMotion(false);
    renderScroller("ltr");
    const { scrollTo } = mockGeometry(false, 0);

    fireEvent.click(screen.getByRole("button", { name: "Scroll content right" }));

    expect(scrollTo.mock.calls[0]?.[0]).toMatchObject({ behavior: "smooth" });
  });
});
