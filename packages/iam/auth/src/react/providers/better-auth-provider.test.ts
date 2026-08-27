import { describe, expect, it } from "vitest";
import { resolveBetterAuthBaseUrl } from "./better-auth-provider";

describe("resolveBetterAuthBaseUrl", () => {
  it("resolves the default relative API path against the browser origin", () => {
    expect(resolveBetterAuthBaseUrl("/api/auth", "http://localhost:3001")).toBe(
      "http://localhost:3001/api/auth",
    );
  });

  it("preserves already absolute Better Auth URLs", () => {
    expect(resolveBetterAuthBaseUrl("https://auth.example.com/api/auth")).toBe(
      "https://auth.example.com/api/auth",
    );
  });
});
