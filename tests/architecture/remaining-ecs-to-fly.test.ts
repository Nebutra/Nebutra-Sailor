import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("remaining Next edges on Fly", () => {
  it("sso, admin, and docs are Next Machines in sin", () => {
    const fly = readFileSync(resolve(ROOT, ".github/workflows/deploy-fly.yml"), "utf-8");
    const certs = readFileSync(resolve(ROOT, ".github/workflows/issue-fly-certs.yml"), "utf-8");

    for (const row of [
      { app: "idp", flyApp: "nebutra-idp", host: "sso", toml: "idp.toml" },
      { app: "admin", flyApp: "nebutra-admin", host: "admin", toml: "admin.toml" },
      {
        app: "sailor-docs",
        flyApp: "nebutra-docs",
        host: "docs",
        toml: "sailor-docs.toml",
      },
    ]) {
      expect(fly).toContain(`"app":"${row.app}"`);
      expect(fly).toContain(`"fly_app":"${row.flyApp}"`);
      expect(fly).toContain(`"host":"${row.host}"`);
      expect(certs).toContain(row.flyApp);
      expect(certs).toContain(`host: ${row.host}`);

      const toml = readFileSync(resolve(ROOT, "infra/fly", row.toml), "utf-8");
      expect(toml).toContain(`app = "${row.flyApp}"`);
      expect(toml).toContain('primary_region = "sin"');
      expect(toml).toContain('HOSTNAME = "0.0.0.0"');
      expect(toml).toContain('PORT = "8080"');
    }

    expect(fly).toContain('"build_command":"build:vm"');
    const idp = readFileSync(resolve(ROOT, "infra/fly/idp.toml"), "utf-8");
    expect(idp).toContain("https://sso.nebutra.com");
  });

  it("carina, New-API, and leak DNS have their own Fly apps", () => {
    const carina = readFileSync(resolve(ROOT, "infra/fly/carina.toml"), "utf-8");
    expect(carina).toContain('app = "nebutra-carina"');
    expect(carina).toContain('primary_region = "sin"');

    const newApi = readFileSync(resolve(ROOT, "infra/fly/new-api.toml"), "utf-8");
    expect(newApi).toContain('app = "nebutra-new-api"');
    expect(newApi).toContain("calciumion/new-api:v0.8.7.4");
    expect(newApi).toContain("new_api_data");
    expect(newApi).not.toMatch(/\[http_service\]/);

    const leak = readFileSync(resolve(ROOT, "infra/fly/dns-leak.toml"), "utf-8");
    expect(leak).toContain('app = "nebutra-dns-leak"');
    expect(leak).toContain('protocol = "udp"');
    expect(leak).toContain("internal_port = 53");
    expect(leak).toContain('FORGE_DNS_LEAK_API_HOST = "0.0.0.0"');

    const carinaWf = readFileSync(
      resolve(ROOT, ".github/workflows/deploy-carina-fly.yml"),
      "utf-8",
    );
    expect(carinaWf).toContain("nebutra-carina");
    const newApiWf = readFileSync(
      resolve(ROOT, ".github/workflows/deploy-new-api-fly.yml"),
      "utf-8",
    );
    expect(newApiWf).toContain("nebutra-new-api.internal:3000/v1");
    expect(newApiWf).toContain("SESSION_SECRET");
    const leakWf = readFileSync(
      resolve(ROOT, ".github/workflows/deploy-dns-leak-fly.yml"),
      "utf-8",
    );
    expect(leakWf).toContain("allocate-v4");
    expect(leakWf).toContain("point-leak-zone-dns.sh");

    const certs = readFileSync(resolve(ROOT, ".github/workflows/issue-fly-certs.yml"), "utf-8");
    expect(certs).toContain("nebutra-carina");
    expect(certs).toContain("host: carina");

    const topo = readFileSync(resolve(ROOT, "infra/ops/dns/topology.defaults.yaml"), "utf-8");
    const ecsSurfaces = topo.split("\n").find((line) => line.startsWith("ecs_surfaces:"));
    expect(ecsSurfaces ?? "").toMatch(/ecs_surfaces:\s*\[\s*\]/);
  });
});
