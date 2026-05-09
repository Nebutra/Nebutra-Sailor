import { describe, expect, it } from "vitest";
import { describeEnv, detectProvider, readConfiguredProvider } from "../detect.js";

describe("detect.readConfiguredProvider", () => {
  it("returns undefined when DESIGN_SYNC_PROVIDER is unset", () => {
    expect(readConfiguredProvider({})).toBeUndefined();
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "" })).toBeUndefined();
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "   " })).toBeUndefined();
  });

  it("returns the provider when DESIGN_SYNC_PROVIDER is a known value", () => {
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "figma" })).toBe("figma");
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "penpot" })).toBe("penpot");
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "git-only" })).toBe("git-only");
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "memory" })).toBe("memory");
  });

  it("returns undefined for unknown provider names", () => {
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "sketch" })).toBeUndefined();
    expect(readConfiguredProvider({ DESIGN_SYNC_PROVIDER: "figma2" })).toBeUndefined();
  });
});

describe("detect.detectProvider", () => {
  it("falls back to git-only when no env vars are present", () => {
    expect(detectProvider({})).toBe("git-only");
  });

  it("respects DESIGN_SYNC_PROVIDER over auto-detection", () => {
    expect(
      detectProvider({
        DESIGN_SYNC_PROVIDER: "git-only",
        FIGMA_PERSONAL_ACCESS_TOKEN: "tok",
        FIGMA_FILE_ID: "abc",
      }),
    ).toBe("git-only");
  });

  it("picks figma when both FIGMA_PERSONAL_ACCESS_TOKEN and FIGMA_FILE_ID are set", () => {
    expect(
      detectProvider({
        FIGMA_PERSONAL_ACCESS_TOKEN: "tok",
        FIGMA_FILE_ID: "file_xyz",
      }),
    ).toBe("figma");
  });

  it("does NOT pick figma if only the token is set", () => {
    expect(detectProvider({ FIGMA_PERSONAL_ACCESS_TOKEN: "tok" })).toBe("git-only");
  });

  it("does NOT pick figma if only the file id is set", () => {
    expect(detectProvider({ FIGMA_FILE_ID: "abc" })).toBe("git-only");
  });

  it("picks penpot when both PENPOT_API_URL and PENPOT_TOKEN are set", () => {
    expect(
      detectProvider({
        PENPOT_API_URL: "https://design.penpot.app/api",
        PENPOT_TOKEN: "tok",
      }),
    ).toBe("penpot");
  });

  it("prefers figma over penpot if both providers are configured", () => {
    expect(
      detectProvider({
        FIGMA_PERSONAL_ACCESS_TOKEN: "tok",
        FIGMA_FILE_ID: "file",
        PENPOT_API_URL: "https://penpot.example",
        PENPOT_TOKEN: "ptok",
      }),
    ).toBe("figma");
  });
});

describe("detect.describeEnv", () => {
  it("classifies env vars into detected vs missing buckets", () => {
    const result = describeEnv({
      FIGMA_PERSONAL_ACCESS_TOKEN: "tok",
      FIGMA_FILE_ID: "file",
    });

    expect(result.resolved).toBe("figma");
    expect(result.detected).toContain("FIGMA_PERSONAL_ACCESS_TOKEN");
    expect(result.detected).toContain("FIGMA_FILE_ID");
    expect(result.missing).toContain("PENPOT_TOKEN");
  });

  it("returns git-only when no env vars are configured", () => {
    const result = describeEnv({});
    expect(result.resolved).toBe("git-only");
    expect(result.detected).toEqual([]);
  });
});
