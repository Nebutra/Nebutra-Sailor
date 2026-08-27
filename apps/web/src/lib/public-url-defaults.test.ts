import { brand } from "@nebutra/brand/metadata";
import { describe, expect, it } from "vitest";
import { getDefaultPublicUrls } from "./public-url-defaults";

describe("getDefaultPublicUrls", () => {
  it("uses brand.domains for production", () => {
    expect(getDefaultPublicUrls("production")).toEqual({
      siteUrl: `https://${brand.domains.app}`,
      appUrl: `https://${brand.domains.app}`,
      apiUrl: `https://${brand.domains.api}`,
      authUrl: `https://${brand.domains.auth}`,
    });
  });

  it("localhost for non-production", () => {
    const d = {
      siteUrl: "http://localhost:3001",
      appUrl: "http://localhost:3001",
      apiUrl: "http://localhost:3002",
      authUrl: "http://localhost:3101",
    };
    expect(getDefaultPublicUrls("development")).toEqual(d);
    expect(getDefaultPublicUrls("test")).toEqual(d);
  });
});
