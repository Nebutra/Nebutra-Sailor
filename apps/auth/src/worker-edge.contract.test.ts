import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "worker-edge.ts"), "utf8");

describe("auth-edge worker contract", () => {
  it("opens a max-1 pg Pool per request and ends it after Better Auth returns", () => {
    expect(source).toContain("max: 1");
    expect(source).toContain("pool.end");
    expect(source).not.toContain("authSingleton");
    expect(source).not.toContain("new Client");
    expect(source).toContain("withConnectRetry");
    expect(source).toContain("attachPoolErrorGuard");
  });

  it("exposes a Hyperdrive probe that runs before Better Auth", () => {
    expect(source).toContain('probe") === "db"');
    expect(source).toMatch(/SELECT\s+1/u);
  });

  it("bumps edgeBuild when the request-path contract changes", () => {
    expect(source).toContain('edgeBuild: "2026-08-31-auth-cors"');
  });

  it("attaches first-party CORS to every /api/auth response, not only OPTIONS", () => {
    expect(source).toContain("applyEdgeAuthCors");
  });

  it("hands off OAuth through a same-host success page and shows the Google picker", () => {
    expect(source).toContain("finalizeOAuthCallback");
    expect(source).toContain("handleLoginSuccess");
    expect(source).toContain("isOAuthCallbackPath");
    expect(source).toContain("applySessionHint");
    expect(source).toContain('prompt: "select_account"');
  });
});
