import { describe, expect, it } from "vitest";
import {
  type StorageLike,
  safeGetItem,
  safeGetJson,
  safeRemoveItem,
  safeSetItem,
  safeSetJson,
} from "../safe-storage";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

function throwingStorage(): StorageLike {
  return {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
}

describe("safeStorage", () => {
  it("round-trips strings and json via injectable storage", () => {
    const store = memoryStorage();
    expect(safeSetItem("k", "v", "local", store)).toBe(true);
    expect(safeGetItem("k", "local", store)).toBe("v");
    expect(safeSetJson("j", { a: 1 }, "local", store)).toBe(true);
    expect(safeGetJson<{ a: number }>("j", "local", store)).toEqual({ a: 1 });
    expect(safeRemoveItem("k", "local", store)).toBe(true);
    expect(safeGetItem("k", "local", store)).toBeNull();
  });

  it("returns null/false when storage throws", () => {
    const store = throwingStorage();
    expect(safeGetItem("x", "local", store)).toBeNull();
    expect(safeSetItem("x", "y", "local", store)).toBe(false);
    expect(safeRemoveItem("x", "local", store)).toBe(false);
  });

  it("returns null/false when storage is unavailable", () => {
    expect(safeGetItem("x", "local", null)).toBeNull();
    expect(safeSetItem("x", "y", "local", null)).toBe(false);
  });
});
