import { describe, expect, it, vi } from "vitest";
import { recoverFromPreloadError } from "./preload-recovery";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("recoverFromPreloadError", () => {
  it("reloads once for a missing chunk", () => {
    const reload = vi.fn();
    expect(
      recoverFromPreloadError({ storage: memoryStorage(), now: () => 1_000_000, reload }),
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does not loop when the new shell also fails", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    recoverFromPreloadError({ storage, now: () => 1_000_000, reload });
    expect(recoverFromPreloadError({ storage, now: () => 1_010_000, reload })).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("recovers again after the window passes", () => {
    const storage = memoryStorage();
    const reload = vi.fn();
    recoverFromPreloadError({ storage, now: () => 1_000_000, reload });
    expect(recoverFromPreloadError({ storage, now: () => 1_031_000, reload })).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it("surfaces the error when storage is unavailable", () => {
    const reload = vi.fn();
    const storage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    };
    expect(recoverFromPreloadError({ storage, now: () => 0, reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
