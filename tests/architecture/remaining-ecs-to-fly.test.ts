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
});
