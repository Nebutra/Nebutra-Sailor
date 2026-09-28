import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedSpan, Terminal, TypingAnimation } from "../terminal";

// jsdom has no IntersectionObserver; report every element as in view.
class InViewObserver {
  constructor(private cb: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.cb(
      [{ isIntersecting: true, intersectionRatio: 1, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
vi.stubGlobal("IntersectionObserver", InViewObserver);

/**
 * A typed line must stay typed while the lines after it complete. It used to
 * restart from its first character on every later completion (the effect
 * depended on the sequence context object, rebuilt on each one).
 */
describe("Terminal sequence", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not retype a finished command while later lines appear", () => {
    render(
      <Terminal startOnView={false}>
        <TypingAnimation duration={10}>npx create-sailor</TypingAnimation>
        <AnimatedSpan>one</AnimatedSpan>
        <AnimatedSpan>two</AnimatedSpan>
        <AnimatedSpan>three</AnimatedSpan>
      </Terminal>,
    );
    const seen: string[] = [];
    for (let t = 0; t < 400; t++) {
      act(() => {
        vi.advanceTimersByTime(10);
      });
      const el = screen.queryByText(/^npx/);
      if (el) seen.push(el.textContent ?? "");
    }
    const full = seen.indexOf("npx create-sailor");
    expect(full).toBeGreaterThan(-1);
    expect(seen.slice(full).every((s) => s === "npx create-sailor")).toBe(true);
  });
});
