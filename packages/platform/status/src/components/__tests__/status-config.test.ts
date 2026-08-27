import { describe, expect, it } from "vitest";
import { buildStatusConfig } from "../status-config";

describe("buildStatusConfig", () => {
  it("defaults to OpenStatus when only pageSlug is set", () => {
    expect(buildStatusConfig({ pageSlug: "nebutra" })).toEqual({ pageSlug: "nebutra" });
  });

  it("builds Statuspage / Better Stack / Instatus / internal configs", () => {
    expect(buildStatusConfig({ provider: "statuspage", pageId: "kctbh9vrtdwd" })).toEqual({
      provider: "statuspage",
      pageId: "kctbh9vrtdwd",
    });

    expect(
      buildStatusConfig({
        provider: "betterstack",
        pageUrl: "https://status.example.com",
      }),
    ).toEqual({
      provider: "betterstack",
      pageUrl: "https://status.example.com",
    });

    expect(buildStatusConfig({ provider: "instatus", pageSlug: "acme" })).toEqual({
      provider: "instatus",
      pageUrl: "acme",
    });

    expect(
      buildStatusConfig({
        provider: "internal",
        healthUrl: "https://api.example.com/health",
      }),
    ).toEqual({
      provider: "internal",
      healthUrl: "https://api.example.com/health",
    });
  });

  it("returns null when required identifiers are missing", () => {
    expect(buildStatusConfig({ provider: "betterstack" })).toBeNull();
    expect(buildStatusConfig({ provider: "instatus" })).toBeNull();
    expect(buildStatusConfig({ provider: "statuspage" })).toBeNull();
    expect(buildStatusConfig({ provider: "internal" })).toBeNull();
    expect(buildStatusConfig({})).toBeNull();
  });
});
