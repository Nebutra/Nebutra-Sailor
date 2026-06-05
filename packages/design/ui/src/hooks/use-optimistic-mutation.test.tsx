import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOptimisticState } from "./use-optimistic-mutation";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("useOptimisticState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("keeps a fresh optimistic update pending when an older success timer expires", () => {
    const { result } = renderHook(() => useOptimisticState({ initialData: "initial" }));

    act(() => {
      result.current.startOptimistic("saved");
      result.current.confirmSuccess();
    });
    expect(result.current.status).toBe("success");

    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.startOptimistic("next");
    });
    expect(result.current.status).toBe("pending");

    act(() => {
      vi.advanceTimersByTime(501);
    });

    expect(result.current.status).toBe("pending");
    expect(result.current.data).toBe("next");
  });
});
