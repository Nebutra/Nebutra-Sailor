import { describe, expect, it } from "vitest";
import { describeEnv, detectProvider, readConfiguredProvider } from "../detect";

describe("detect.readConfiguredProvider", () => {
  it("returns undefined when DESIGN_SYNC_PROVIDER is unset", () => {
    expect(readConfiguredProvider({})).toBeUndefined();
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "" })).toBeUndefined();
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "   " })).toBeUndefined();
  });

  it("returns the provider when DESIGN_SYNC_PROVIDER is a known value", () => {
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "git-only" })).toBe("git-only");
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "memory" })).toBe("memory");
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "design-md" })).toBe("design-md");
  });

  it("returns undefined for unknown provider names", () => {
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "sketch" })).toBeUndefined();
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "figma" })).toBeUndefined();
  });
});

describe("detect.detectProvider", () => {
  it("falls back to git-only when no env vars are present", () => {
    expect(detectProvider({})).toBe("git-only");
  });

  it("respects DESIGN_SYNC_PROVIDER over the fallback", () => {
    expect(
      detectProvider({
        DESIGN_SYNC_PROVIDER: "git-only",
      }),
    ).toBe("git-only");
  });
});

describe("detect.describeEnv", () => {
  it("returns git-only when no env vars are configured", () => {
    const result = describeEnv({});
    expect(result.resolved).toBe("git-only");
    expect(result.detected).toEqual([]);
  });

  it("includes DESIGN_MD_PATH in the missing bucket when not set", () => {
    const result = describeEnv({});
    expect(result.missing).toContain("DESIGN_MD_PATH");
  });

  it("includes DESIGN_MD_PATH in the detected bucket when set", () => {
    const result = describeEnv({ DESIGN_MD_PATH: "/workspace/DESIGN.md" });
    expect(result.detected).toContain("DESIGN_MD_PATH");
  });
});

describe("detect — design-md provider", () => {
  it("readConfiguredProvider returns design-md when DESIGN_SYNC_PROVIDER=design-md", () => {
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "design-md" })).toBe("design-md");
  });

  it("detectProvider returns design-md when DESIGN_SYNC_PROVIDER=design-md", () => {
    expect(detectProvider({ DESIGN_SYNC_PROVIDER: "design-md" })).toBe("design-md");
  });

  it("detectProvider does NOT auto-select design-md — fallback is still git-only", () => {
    expect(detectProvider({})).toBe("git-only");
  });
});
