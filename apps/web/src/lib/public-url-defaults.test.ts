import { describe, expect, it } from "vitest";
import { getDefaultPublicUrls } from "./public-url-defaults";

describe("getDefaultPublicUrls", () => {
  it("uses production domains for production builds", () => {
    expect(getDefaultPublicUrls("production")).toEqual({
      siteUrl: "https://app.nebutra.com",
      appUrl: "https://app.nebutra.com",
      apiUrl: "https://api.nebutra.com",
    });
  });

  it("uses localhost defaults for development builds", () => {
    expect(getDefaultPublicUrls("development")).toEqual({
      siteUrl: "http://localhost:3001",
      appUrl: "http://localhost:3001",
      apiUrl: "http://localhost:3002",
    });
  });

  it("keeps localhost defaults outside production", () => {
    expect(getDefaultPublicUrls("test")).toEqual({
      siteUrl: "http://localhost:3001",
      appUrl: "http://localhost:3001",
      apiUrl: "http://localhost:3002",
    });
  });
});
