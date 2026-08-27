import { describe, expect, it } from "vitest";
import { resolveApiBaseUrlFromEnv } from "../browser-client";

describe("resolveApiBaseUrlFromEnv", () => {
  it("prefers the Vite public gateway URL in the browser bundle", () => {
    expect(
      resolveApiBaseUrlFromEnv({
        viteEnv: { VITE_API_GATEWAY_URL: "https://vite-api.example.com" },
        nodeEnv: { NEXT_PUBLIC_API_GATEWAY_URL: "https://next-api.example.com" },
      }),
    ).toBe("https://vite-api.example.com");
  });

  it("falls back to Next public env when imported by a server route during standalone builds", () => {
    expect(
      resolveApiBaseUrlFromEnv({
        viteEnv: undefined,
        nodeEnv: { NEXT_PUBLIC_API_GATEWAY_URL: "https://api.nebutra.com" },
      }),
    ).toBe("https://api.nebutra.com");
  });

  it("keeps relative API calls when neither runtime exposes a gateway URL", () => {
    expect(resolveApiBaseUrlFromEnv({ viteEnv: undefined, nodeEnv: {} })).toBe("");
  });
});
