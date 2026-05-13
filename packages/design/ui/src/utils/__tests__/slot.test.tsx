import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Slot } from "../slot";

/**
 * Regression guard: Slot must never throw on JSX shapes that prerender
 * pipelines can produce. The original implementation used `React.Children.only`,
 * which throws when `children` is a single-element array (e.g. `[<a/>]`) even
 * though `React.Children.count` reports 1 — a real failure mode hit during the
 * 2026-05-13 landing-page deploy. We resolve via `Children.toArray` instead.
 */
describe("Slot — must not throw on any valid JSX shape", () => {
  it("clones a single element child", () => {
    const { getByTestId } = render(
      <Slot className="outer">
        <a data-testid="inner" href="/x" />
      </Slot>,
    );
    expect(getByTestId("inner").getAttribute("class")).toContain("outer");
  });

  it("does not throw on a single-element array (RSC serialization shape)", () => {
    const arr = [<a key="x" data-testid="arr-inner" href="/x" />];
    expect(() => render(<Slot className="outer">{arr}</Slot>)).not.toThrow();
  });

  it("falls back to span on zero children", () => {
    const { container } = render(<Slot className="empty" />);
    expect(container.querySelector("span.empty")).not.toBeNull();
  });

  it("falls back to span on multiple children", () => {
    const { container } = render(
      <Slot className="multi">
        <a href="/a" />
        <a href="/b" />
      </Slot>,
    );
    expect(container.querySelector("span.multi")).not.toBeNull();
  });

  it("falls back to span on string-only child", () => {
    const { container } = render(<Slot className="str">hello</Slot>);
    expect(container.querySelector("span.str")?.textContent).toBe("hello");
  });

  it("merges className and style onto the cloned child", () => {
    const { getByTestId } = render(
      <Slot className="from-slot" style={{ color: "red" }}>
        <a data-testid="merge" href="/x" className="from-child" style={{ fontSize: 12 }} />
      </Slot>,
    );
    const el = getByTestId("merge");
    expect(el.className).toContain("from-slot");
    expect(el.className).toContain("from-child");
    expect(el.style.color).toBe("red");
    expect(el.style.fontSize).toBe("12px");
  });
});
