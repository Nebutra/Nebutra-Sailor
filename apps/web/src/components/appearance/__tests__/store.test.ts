import { describe, expect, it, vi } from "vitest";
import {
  ACCENT_SWATCHES,
  type AppearanceMotion,
  accentRingChannels,
  useAppearanceStore,
} from "../store";

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
  it("turns each accent preset into the bare HSL channels --ring holds", () => {
    expect(accentRingChannels("default")).toBeNull();
    expect(accentRingChannels("blue")).toBe("217.2 91.2% 59.8%"); // #3b82f6
    for (const accent of Object.keys(ACCENT_SWATCHES) as Array<keyof typeof ACCENT_SWATCHES>) {
      expect(accentRingChannels(accent)).toMatch(/^[\d.]+ [\d.]+% [\d.]+%$/);
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
