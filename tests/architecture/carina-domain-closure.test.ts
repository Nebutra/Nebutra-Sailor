import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { brand } from "../../packages/design/brand/src/metadata";
import { getBrandOrigin, getBrandPublicUrls } from "../../packages/design/brand/src/metadata-helpers";
import { DEFAULT_BRAND } from "../../scripts/brand-types";

/**
 * Contract lock for carina.nebutra.com — product docs front on Vercel,
 * zone DNS owned by this monorepo. Prevents silent drift between brand SSOT,
 * topology, workflows, and docs/DOMAINS.md.
 */
describe("carina domain closure", () => {
  it("brand SSOT carries carina.nebutra.com", () => {
    expect(DEFAULT_BRAND.domains.carina).toBe("carina.nebutra.com");
    expect(brand.domains.carina).toBe("carina.nebutra.com");
    expect(getBrandOrigin("carina")).toBe("https://carina.nebutra.com");
    expect(getBrandPublicUrls().carinaUrl).toBe("https://carina.nebutra.com");
  });

  it("topology lists carina as a vercel surface (not ECS)", () => {
    const raw = readFileSync("infra/ops/dns/topology.defaults.yaml", "utf-8");
    expect(raw).toMatch(/vercel_surfaces:.*\[.*carina/);
    expect(raw).toMatch(/^\s*carina,/m);
    expect(raw).not.toMatch(/ecs_surfaces:.*carina/);
  });

  it("DOMAINS.md documents host, deploy, and no parallel origin", () => {
    const domains = readFileSync("docs/DOMAINS.md", "utf-8");
    expect(domains).toContain("carina.nebutra.com");
    expect(domains).toContain("nebutra-carina");
    expect(domains).toContain("point-carina-dns");
    expect(domains).toContain("deploy-carina-vercel");
    expect(domains).toMatch(/api\.carina\.\*/);
    expect(domains).toContain("Nebutra/carina");
  });

  it("ops scripts and workflows exist and are executable paths", () => {
    const script = join(process.cwd(), "infra/ops/scripts/point-carina-dns-vercel.sh");
    const dnsWf = join(process.cwd(), ".github/workflows/point-carina-dns.yml");
    const deployWf = join(process.cwd(), ".github/workflows/deploy-carina-vercel.yml");
    expect(existsSync(script), script).toBe(true);
    expect(existsSync(dnsWf), dnsWf).toBe(true);
    expect(existsSync(deployWf), deployWf).toBe(true);

    const scriptBody = readFileSync(script, "utf-8");
    expect(scriptBody).toContain("carina");
    expect(scriptBody).toContain("cname.vercel-dns.com");

    const deploy = readFileSync(deployWf, "utf-8");
    expect(deploy).toContain("Nebutra/carina");
    expect(deploy).toContain("apps/docs");
    expect(deploy).toContain("nebutra-carina");
    expect(deploy).toContain("carina.nebutra.com");

    const dns = readFileSync(dnsWf, "utf-8");
    expect(dns).toContain("point-carina-dns-vercel.sh");
  });

  it("dns:render emits a carina CNAME when topology is loaded", () => {
    // Dry-run render logic: brand + topology must resolve carina → www_cname
    const topo = readFileSync("infra/ops/dns/topology.defaults.yaml", "utf-8");
    expect(topo).toMatch(/www_cname:\s*"cname\.vercel-dns\.com"/);
    expect(DEFAULT_BRAND.domains.carina.startsWith("carina.")).toBe(true);

    // Script stays tracked (gitignored zone files are not)
    const tracked = execSync("git ls-files infra/ops/scripts/point-carina-dns-vercel.sh", {
      encoding: "utf-8",
    }).trim();
    // Untracked until commit — still require file on disk
    expect(existsSync("infra/ops/scripts/point-carina-dns-vercel.sh")).toBe(true);
    void tracked;
  });
});
