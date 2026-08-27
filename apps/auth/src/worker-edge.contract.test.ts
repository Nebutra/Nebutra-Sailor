import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(path.join(__dirname, "worker-edge.ts"), "utf8");

describe("auth-edge worker contract", () => {
  it("opens a pg Client per request instead of reusing a Pool across isolates", () => {
    expect(source).toContain("new Client");
    expect(source).toContain("client.end");
    expect(source).not.toContain("await client.connect()");
    expect(source).not.toContain("authSingleton");
    expect(source).toContain("withConnectRetry");
    expect(source).toContain("attachPoolErrorGuard");
  });

  it("exposes a Hyperdrive probe that runs before Better Auth", () => {
    expect(source).toContain('probe") === "db"');
    expect(source).toMatch(/SELECT\s+1/u);
  });

  it("bumps edgeBuild when the request-path contract changes", () => {
    expect(source).toContain('edgeBuild: "2026-08-27-pg-client-no-preconnect"');
  });
});
