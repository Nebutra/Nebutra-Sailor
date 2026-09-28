import { describe, expect, it, vi } from "vitest";
import { type AppearanceMotion, useAppearanceStore } from "../store";

// The store persists through localStorage, which zustand resolves when the
// module is imported; the node test environment has none, so provide it first.
vi.hoisted(() => {
  const memory = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
  } as Storage;
});

describe("appearance store", () => {
  it("keeps the viewer's preferences only; the product's look is chosen in Studio", () => {
    const { update } = useAppearanceStore.getState();
    update({ theme: "linear", accent: "blue" } as never);
    const state = useAppearanceStore.getState();
    for (const retired of ["theme", "importedTheme", "accent", "backgroundColor", "uiFontFamily"]) {
      expect(retired in state).toBe(false);
    }
  });

  it("offers follow-the-OS or reduce, and sanitizes the retired 'off' to system", () => {
    const { update } = useAppearanceStore.getState();
    update({ motion: "on" });
    expect(useAppearanceStore.getState().motion).toBe("on");
    update({ motion: "off" as unknown as AppearanceMotion });
    expect(useAppearanceStore.getState().motion).toBe("system");
  });

  it("no longer carries a contrast setting nothing read", () => {
    expect("contrast" in useAppearanceStore.getState()).toBe(false);
  });
});
