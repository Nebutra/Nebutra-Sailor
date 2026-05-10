import { describe, expect, it } from "vitest";
import { parseBoolFlag, resolveWaveFeatureToggles } from "../wave-features";

describe("parseBoolFlag", () => {
  it("returns the fallback when the input is undefined", () => {
    expect(parseBoolFlag(undefined, true)).toBe(true);
    expect(parseBoolFlag(undefined, false)).toBe(false);
  });

  it("accepts truthy strings (true / 1 / yes / on, case-insensitive)", () => {
    expect(parseBoolFlag("true", false)).toBe(true);
    expect(parseBoolFlag("TRUE", false)).toBe(true);
    expect(parseBoolFlag("1", false)).toBe(true);
    expect(parseBoolFlag("yes", false)).toBe(true);
    expect(parseBoolFlag("on", false)).toBe(true);
  });

  it("accepts falsy strings (false / 0 / no / off, case-insensitive)", () => {
    expect(parseBoolFlag("false", true)).toBe(false);
    expect(parseBoolFlag("FALSE", true)).toBe(false);
    expect(parseBoolFlag("0", true)).toBe(false);
    expect(parseBoolFlag("no", true)).toBe(false);
    expect(parseBoolFlag("off", true)).toBe(false);
  });

  it("falls back when the input is unrecognised garbage", () => {
    expect(parseBoolFlag("maybe", true)).toBe(true);
    expect(parseBoolFlag("", false)).toBe(false);
  });
});

describe("resolveWaveFeatureToggles", () => {
  it("defaults every wave 3-5 toggle to true for global region", () => {
    const result = resolveWaveFeatureToggles({}, "global");

    expect(result).toEqual({
      cronJobs: true,
      auditLog: true,
      apiKeys: true,
      webhooks: true,
      commandPalette: true,
      cookieConsent: true,
      legalPages: true,
      // chinaCompliance defaults to false outside the cn region
      chinaCompliance: false,
    });
  });

  it("auto-enables china-compliance when region=cn", () => {
    const result = resolveWaveFeatureToggles({}, "cn");

    expect(result.chinaCompliance).toBe(true);
    // Other defaults are unchanged.
    expect(result.cronJobs).toBe(true);
    expect(result.auditLog).toBe(true);
  });

  it("respects explicit overrides over region defaults", () => {
    const result = resolveWaveFeatureToggles(
      {
        cronJobs: "false",
        auditLog: "false",
        apiKeys: "false",
        webhooks: "false",
        commandPalette: "false",
        cookieConsent: "false",
        legalPages: "false",
        chinaCompliance: "false",
      },
      "cn",
    );

    expect(result).toEqual({
      cronJobs: false,
      auditLog: false,
      apiKeys: false,
      webhooks: false,
      commandPalette: false,
      cookieConsent: false,
      legalPages: false,
      // even with region=cn the explicit override wins
      chinaCompliance: false,
    });
  });

  it("allows enabling china-compliance from a non-cn region via flag", () => {
    const result = resolveWaveFeatureToggles({ chinaCompliance: "true" }, "global");
    expect(result.chinaCompliance).toBe(true);
  });

  it("returns a fresh object — input flags are never mutated", () => {
    const flags = { cronJobs: "false" };
    const result = resolveWaveFeatureToggles(flags, "global");

    expect(result.cronJobs).toBe(false);
    // Input mutation guard.
    expect(flags).toEqual({ cronJobs: "false" });
  });
});
