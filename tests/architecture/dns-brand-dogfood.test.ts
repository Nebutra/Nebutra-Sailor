import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND } from "../../scripts/brand-types";

describe("dns brand dogfood", () => {
  it("brand.domains includes product edges", () => {
    for (const key of [
      "landing",
      "app",
      "auth",
      "api",
      "sso",
      "docs",
      "router",
      "forge",
    ] as const) {
      expect(DEFAULT_BRAND.domains[key]).toMatch(/\./);
    }
  });
  it("only allowlisted dns paths tracked", () => {
    expect(existsSync(join(process.cwd(), "infra/ops/dns/topology.defaults.yaml"))).toBe(true);
    const tracked = execSync("git ls-files infra/ops/dns", { encoding: "utf-8" })
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((p) => p.replace(/^infra\/ops\/dns\//, ""));
    const allow = new Set(["README.md", ".gitignore", "topology.defaults.yaml"]);
    for (const f of tracked) expect(allow.has(f), f).toBe(true);
  });
  it("topology has no brand hosts", () => {
    const raw = readFileSync("infra/ops/dns/topology.defaults.yaml", "utf-8");
    expect(raw).not.toMatch(/app\.nebutra\.com/);
    expect(raw).toMatch(/ecs_host/);
  });
});
