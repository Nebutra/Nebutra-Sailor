import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "worker-edge.ts"), "utf8");

describe("auth-edge worker contract", () => {
  it("guards pg pool errors so they cannot become Cloudflare Error 1101", () => {
    expect(source).toContain("attachPoolErrorGuard");
    expect(source).toContain("discardAuthPool");
    expect(source).toContain("withConnectRetry");
  });

  it("exposes a Hyperdrive probe that runs before Better Auth", () => {
    expect(source).toContain('probe") === "db"');
    expect(source).toMatch(/SELECT\s+1/u);
  });

  it("bumps edgeBuild when the request-path contract changes", () => {
    expect(source).toContain('edgeBuild: "2026-08-27-pg-pool-guard"');
  });
});
