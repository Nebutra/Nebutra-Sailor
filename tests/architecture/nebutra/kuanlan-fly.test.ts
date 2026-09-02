import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("kuanlan Fly origin", () => {
  it("ships as a Next standalone Machine in sin, not ECS auto-push", () => {
    const fly = readFileSync(resolve(ROOT, ".github/workflows/deploy-fly.yml"), "utf-8");
    expect(fly).toContain('"app":"kuanlan"');
    expect(fly).toContain('"fly_app":"nebutra-kuanlan"');
    expect(fly).toContain('"host":"kuanlan"');
    expect(fly).toContain("apps/kuanlan/**");
    expect(fly).toContain("github.event.inputs.cutover == 'true'");

    const toml = readFileSync(resolve(ROOT, "infra/fly/kuanlan.toml"), "utf-8");
    expect(toml).toContain('app = "nebutra-kuanlan"');
    expect(toml).toContain('primary_region = "sin"');
    expect(toml).toContain('HOSTNAME = "0.0.0.0"');
    expect(toml).toContain('PORT = "8080"');
    expect(toml).toContain("https://router.nebutra.com/v1");
    expect(toml).not.toContain("302.ai");
    expect(fly).toContain("KUANLAN_ROUTER_API_KEY");
    const consume = fly.slice(fly.indexOf("Set kuanlan consume secrets"));
    expect(consume).toContain("R2_KUANLAN_ACCESS_KEY_ID");
    expect(consume.includes("secrets.R2_ACCESS_KEY_ID")).toBe(false);

    const mint = readFileSync(
      resolve(ROOT, ".github/workflows/ops-kuanlan-r2-uploads.yml"),
      "utf-8",
    );
    expect(mint).toContain("provision-kuanlan-r2-uploads-token.sh");
    const script = readFileSync(
      resolve(ROOT, "infra/ops/scripts/provision-kuanlan-r2-uploads-token.sh"),
      "utf-8",
    );
    expect(script).toContain("nebutra-uploads");
    expect(script).not.toContain('echo "$ACCESS_KEY_ID"');
    expect(script).not.toContain('echo "$SECRET_ACCESS_KEY"');

    const certs = readFileSync(resolve(ROOT, ".github/workflows/issue-fly-certs.yml"), "utf-8");
    expect(certs).toContain("nebutra-kuanlan");
    expect(certs).toContain("host: kuanlan");

    const ecs = readFileSync(resolve(ROOT, ".github/workflows/deploy-ecs.yml"), "utf-8");
    const pushPaths = ecs.match(
      /\n\s+push:\n\s+branches:\s*\[main\]\n\s+paths:\n((?:\s+(?:-|#)[^\n]+\n)+)/,
    )?.[1];
    expect(pushPaths, "deploy-ecs.yml must keep on.push.paths").toBeTruthy();
    expect(pushPaths).not.toContain('- "apps/kuanlan/**"');
    expect(ecs).toContain("rollback-kuanlan-ecs");

    const topo = readFileSync(resolve(ROOT, "infra/ops/dns/topology.defaults.yaml"), "utf-8");
    const ecsSurfaces = topo.split("\n").find((line) => line.startsWith("ecs_surfaces:"));
    expect(ecsSurfaces ?? "").not.toMatch(/kuanlan/);
  });
});
