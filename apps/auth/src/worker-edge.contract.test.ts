import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "worker-edge.ts"), "utf8");
const edgeConfig = readFileSync(path.join(__dirname, "..", "wrangler.edge.jsonc"), "utf8");
const deployWorkflow = readFileSync(
  path.join(__dirname, "..", "..", "..", ".github", "workflows", "deploy-auth-cloudflare.yml"),
  "utf8",
);

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
    expect(source).toContain('edgeBuild: "2026-09-01-fly-ui-origin"');
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

  it("keeps UI pass-through on a dedicated auth origin", () => {
    expect(edgeConfig).toContain('"ORIGIN_URL": "https://nebutra-auth.fly.dev"');
    expect(edgeConfig).not.toMatch(/"ORIGIN_URL"\s*:\s*"https:\/\/origin\.nebutra\.com"/u);
    expect(source).not.toContain("brand.domains.origin");
  });

  it("smokes the sign-in HTML instead of relying on the edge-only health route", () => {
    expect(deployWorkflow).toContain("https://auth.nebutra.com/sign-in");
    expect(deployWorkflow).toContain("content-type");
    expect(deployWorkflow.match(/for i in 1 2 3 4 5 6 7 8; do/gu)).toHaveLength(2);
  });
});
