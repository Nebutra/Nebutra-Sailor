import { describe, expect, it } from "vitest";
import { primaryFamily, resolveRegistryVar, withRegistryFont } from "./index";

describe("@nebutra/fonts registry", () => {
  it("normalizes the primary family (strips quotes, lowercases)", () => {
    expect(primaryFamily("'Space Grotesk', sans-serif")).toBe("space grotesk");
    expect(primaryFamily("Inter")).toBe("inter");
    expect(primaryFamily('"JetBrains Mono", ui-monospace, monospace')).toBe("jetbrains mono");
  });

  it("resolves a registered family to its CSS variable", () => {
    expect(resolveRegistryVar("Space Grotesk, sans-serif")).toBe("--font-space-grotesk");
    expect(resolveRegistryVar("'JetBrains Mono', monospace")).toBe("--font-jetbrains-mono");
    expect(resolveRegistryVar("Geist, sans-serif")).toBe("--font-geist-sans");
  });

  it("returns undefined for an unregistered (e.g. proprietary) family", () => {
    expect(resolveRegistryVar("Airbnb Cereal VF, sans-serif")).toBeUndefined();
    expect(resolveRegistryVar("BMWTypeNext, sans-serif")).toBeUndefined();
  });

  it("prepends the self-hosted var for a registered family, keeping the fallback", () => {
    expect(withRegistryFont("Space Grotesk, sans-serif")).toBe(
      "var(--font-space-grotesk), Space Grotesk, sans-serif",
    );
    expect(withRegistryFont("'JetBrains Mono', ui-monospace, monospace")).toBe(
      "var(--font-jetbrains-mono), 'JetBrains Mono', ui-monospace, monospace",
    );
  });

  it("leaves an unregistered stack untouched (graceful fallback)", () => {
    expect(withRegistryFont("Airbnb Cereal, sans-serif")).toBe("Airbnb Cereal, sans-serif");
  });

  it("handles undefined/empty input safely", () => {
    expect(withRegistryFont(undefined)).toBeUndefined();
    expect(withRegistryFont("")).toBe("");
  });
});
