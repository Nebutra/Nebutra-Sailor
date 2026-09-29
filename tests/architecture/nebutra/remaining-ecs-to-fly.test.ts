import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("remaining Next edges on Fly", () => {
  it("sso and admin are Next Machines in sin; docs left for Cloudflare Workers", () => {
    const fly = readFileSync(resolve(ROOT, ".github/workflows/deploy-fly.yml"), "utf-8");
    const certs = readFileSync(resolve(ROOT, ".github/workflows/issue-fly-certs.yml"), "utf-8");

    for (const row of [
      { app: "idp", flyApp: "nebutra-idp", host: "sso", toml: "idp.toml" },
      { app: "admin", flyApp: "nebutra-admin", host: "admin", toml: "admin.toml" },
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

    // sailor-docs moved off Fly to Cloudflare Workers 2026-09-29 (see
    // docs/ops/nebutra/2026-09-29-fly-machine-shrink.md) — deploy-fly.yml no
    // longer knows the app at all, and its Fly config is gone.
    expect(fly).not.toContain('"app":"sailor-docs"');
    expect(fly).not.toContain("nebutra-docs");
    expect(() => readFileSync(resolve(ROOT, "infra/fly/sailor-docs.toml"), "utf-8")).toThrow();
    const sailorDocsWf = readFileSync(
      resolve(ROOT, ".github/workflows/deploy-sailor-docs.yml"),
      "utf-8",
    );
    expect(sailorDocsWf).toContain("opennextjs-cloudflare build");
    expect(sailorDocsWf).not.toContain("DEPLOY_TARGET_SAILOR_DOCS");

    expect(fly).toContain("want_carina");
    expect(fly).toContain("want_new_api");
    expect(fly).not.toContain("want_dns_leak");
    expect(fly).toContain("nebutra-carina");
    expect(fly).toContain("nebutra-new-api.internal:3000/v1");
    const idp = readFileSync(resolve(ROOT, "infra/fly/idp.toml"), "utf-8");
    expect(idp).toContain("https://sso.nebutra.com");
  });

  it("carina and New-API have their own Fly apps; forge-dns-leak is embedded in forge", () => {
    const carina = readFileSync(resolve(ROOT, "infra/fly/carina.toml"), "utf-8");
    expect(carina).toContain('app = "nebutra-carina"');
    expect(carina).toContain('primary_region = "sin"');

    const newApi = readFileSync(resolve(ROOT, "infra/fly/new-api.toml"), "utf-8");
    expect(newApi).toContain('app = "nebutra-new-api"');
    expect(newApi).toContain("calciumion/new-api:v0.8.7.4");
    expect(newApi).toContain("new_api_data");
    expect(newApi).not.toMatch(/\[http_service\]/);

    // forge-dns-leak merged into nebutra-forge 2026-09-29 to free a machine
    // slot — no more standalone nebutra-dns-leak app or config.
    expect(() => readFileSync(resolve(ROOT, "infra/fly/dns-leak.toml"), "utf-8")).toThrow();
    expect(() => readFileSync(resolve(ROOT, "infra/fly/Dockerfile.dns-leak"), "utf-8")).toThrow();
    expect(() =>
      readFileSync(resolve(ROOT, ".github/workflows/deploy-dns-leak-fly.yml"), "utf-8"),
    ).toThrow();

    const forge = readFileSync(resolve(ROOT, "infra/fly/forge.toml"), "utf-8");
    expect(forge).toContain('app = "nebutra-forge"');
    expect(forge).toContain('ENABLE_FORGE_DNS_LEAK = "true"');
    expect(forge).toContain('protocol = "udp"');
    expect(forge).toContain("internal_port = 53");
    expect(forge).toContain('FORGE_DNS_LEAK_API_HOST = "127.0.0.1"');

    const standaloneDockerfile = readFileSync(
      resolve(ROOT, "infra/runtime/docker/Dockerfile.standalone"),
      "utf-8",
    );
    expect(standaloneDockerfile).toContain("ENABLE_NET_BIND_CAP");
    expect(standaloneDockerfile).toContain("ENABLE_FORGE_DNS_LEAK");
    expect(standaloneDockerfile).toContain("forge-dns-leak/src/cli.ts");

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

    const fly = readFileSync(resolve(ROOT, ".github/workflows/deploy-fly.yml"), "utf-8");
    expect(fly).toContain("Stage forge-dns-leak into the forge image");
    expect(fly).toContain("Allocate dedicated IPv4 for the leak zone glue");
    expect(fly).toContain("ENABLE_NET_BIND_CAP");

    const certs = readFileSync(resolve(ROOT, ".github/workflows/issue-fly-certs.yml"), "utf-8");
    expect(certs).toContain("nebutra-carina");
    expect(certs).toContain("host: carina");
    expect(certs).toContain("nebutra-design");

    const topo = readFileSync(resolve(ROOT, "infra/ops/dns/topology.defaults.yaml"), "utf-8");
    const ecsSurfaces = topo.split("\n").find((line) => line.startsWith("ecs_surfaces:"));
    expect(ecsSurfaces ?? "").toMatch(/ecs_surfaces:\s*\[\s*\]/);
  });
});
