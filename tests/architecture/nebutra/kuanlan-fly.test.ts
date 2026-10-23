import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("retired Kuanlan Fly surface", () => {
  it("does not remain in active Fly deployment matrices", () => {
    const fly = readFileSync(resolve(ROOT, ".github/workflows/deploy-fly.yml"), "utf-8");
    expect(fly).not.toContain('"app":"kuanlan"');
    expect(fly).not.toContain('"fly_app":"nebutra-kuanlan"');
    expect(fly).not.toContain('"host":"kuanlan"');
    expect(fly).not.toContain("apps/kuanlan/**");
  });

  it("does not remain in the Cloud VM deploy either", () => {
    // Retiring the Fly app left deploy-ecs.yml building kuanlan onto the VM
    // whenever pnpm-lock.yaml changed, then failing the run on a smoke test
    // against a host whose DNS was already gone.
    // Case-sensitive on purpose: the KUANLAN_* secrets are still forwarded
    // through the shared runtime-env list; this guards the app, not them.
    const ecs = readFileSync(resolve(ROOT, ".github/workflows/deploy-ecs.yml"), "utf-8");
    expect(ecs).not.toMatch(/kuanlan/);
  });
});
