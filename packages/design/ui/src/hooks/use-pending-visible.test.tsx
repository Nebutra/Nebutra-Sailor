import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePendingVisible } from "./use-pending-visible";

describe("usePendingVisible", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("never shows for work that finishes inside the show delay", () => {
    const { result, rerender } = renderHook(({ p }) => usePendingVisible(p), {
      initialProps: { p: true },
    });
    act(() => vi.advanceTimersByTime(150));
    rerender({ p: false });
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(false);
  });

  it("shows after the delay and stays for the minimum once shown", () => {
    const { result, rerender } = renderHook(({ p }) => usePendingVisible(p), {
      initialProps: { p: true },
    });
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe(true);
    rerender({ p: false });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(false);
  });
});
