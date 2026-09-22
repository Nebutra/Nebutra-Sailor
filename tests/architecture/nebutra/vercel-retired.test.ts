import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The Vercel deploy surface was retired on 2026-09-22. Landing (nebutra.com)
 * was the last production surface there — every product edge now ships as a
 * Fly Machine through deploy-fly.yml, and DNS lives in Cloudflare in front of
 * those Machines. This file is the tripwire against a second deploy path
 * growing back: no app config, no workflow, no token.
 */
const root = process.cwd();

function readText(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

function walk(dir: string, name: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(rel, name));
    else if (entry.name === name) out.push(rel);
  }
  return out;
}

describe("Vercel deploy surface is retired", () => {
  it("keeps no vercel.json anywhere an app or backend could ship from", () => {
    expect(walk("apps", "vercel.json")).toEqual([]);
    expect(walk("backends", "vercel.json")).toEqual([]);
    expect(existsSync(resolve(root, "vercel.json"))).toBe(false);
    expect(existsSync(resolve(root, ".vercelignore"))).toBe(false);
  });

  it("keeps the Vercel workflows and scripts retired", () => {
    for (const file of [
      ".github/workflows/deploy-vercel.yml",
      ".github/workflows/ops-sync-auth-vercel-db.yml",
      "scripts/vercel-ignore-build.sh",
      "scripts/preflight-web-auth-vercel.mjs",
      "scripts/redeploy-web-auth-vercel.mjs",
      "scripts/brand-vercel-env.ts",
    ]) {
      expect(existsSync(resolve(root, file)), file).toBe(false);
    }
  });

  it("ships landing as a Fly Machine with the apex cutover wired", () => {
    const fly = readText(".github/workflows/deploy-fly.yml");
    expect(fly).toContain('"app":"landing"');
    expect(fly).toContain('"fly_app":"nebutra-landing"');
    expect(fly).toContain("point-landing-dns-fly.sh");
    const toml = readText("infra/fly/landing.toml");
    expect(toml).toContain('app = "nebutra-landing"');
    expect(toml).toContain('primary_region = "sin"');
  });

  it("has no Vercel DNS target left in point-dns.yml", () => {
    const pointDns = readText(".github/workflows/point-dns.yml");
    expect(pointDns).not.toMatch(/^\s+- vercel$/m);
    expect(pointDns).not.toContain("VERCEL_TOKEN");
    expect(pointDns).not.toContain("api.vercel.com");
  });

  it("no workflow holds VERCEL_TOKEN", () => {
    const workflows = readdirSync(resolve(root, ".github/workflows")).filter((file) =>
      /\.ya?ml$/.test(file),
    );
    const withVercel = workflows.filter((file) =>
      readText(`.github/workflows/${file}`).includes("VERCEL_TOKEN"),
    );
    expect(withVercel).toEqual([]);
  });
});
