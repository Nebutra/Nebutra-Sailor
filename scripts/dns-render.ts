#!/usr/bin/env tsx
// dns:render — brand.domains + topology → gitignored zone files
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { type BrandConfig, DEFAULT_BRAND } from "./brand-types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DNS_DIR = path.join(ROOT, "infra", "ops", "dns");
type DomainKey = keyof BrandConfig["domains"];

interface Topology {
  ecs_host: string;
  /**
   * The landing Fly Machine target for the apex/www CNAMEs. Not declared in
   * the topology file: the Fly app name is instance content (it is stripped
   * from the public template), so it is read from infra/fly/landing.toml or
   * DNS_LANDING_CNAME at render time.
   */
  landing_cname?: string;
  mail?: { provider: string; records: Record<string, string> };
  ecs_surfaces: DomainKey[];
  /** Brand fronts served by Fly — CNAME to `landing_cname`, no ECS origin. */
  fly_surfaces?: DomainKey[];
  proxy: { proxied: string[]; dns_only: string[] };
}

/** Resolve the landing target from env, then the Fly manifest, else skip. */
function resolveLandingCname(): string | undefined {
  const fromEnv = process.env.DNS_LANDING_CNAME?.trim();
  if (fromEnv) return fromEnv;
  const manifest = path.join(ROOT, "infra", "fly", "landing.toml");
  if (!fs.existsSync(manifest)) return undefined;
  const app = fs
    .readFileSync(manifest, "utf-8")
    .split("\n")
    .find((line) => line.trimStart().startsWith("app ="));
  const name = app
    ?.split("=")[1]
    ?.trim()
    .replace(/^["']|["']$/g, "");
  return name ? `${name}.fly.dev` : undefined;
}

async function loadBrand(): Promise<BrandConfig> {
  const p = path.join(ROOT, "brand.config.ts");
  if (fs.existsSync(p)) {
    const mod = await import(pathToFileURL(p).href);
    return (mod.default ?? mod) as BrandConfig;
  }
  return DEFAULT_BRAND;
}

function loadTopology(): Topology {
  const t = parseYaml(
    fs.readFileSync(path.join(DNS_DIR, "topology.defaults.yaml"), "utf-8"),
  ) as Topology;
  if (process.env.ECS_HOST?.trim()) t.ecs_host = process.env.ECS_HOST.trim();
  t.landing_cname = resolveLandingCname();
  return t;
}

function rel(host: string, zone: string) {
  if (host === zone) return "@";
  const s = `.${zone}`;
  return host.endsWith(s) ? host.slice(0, -s.length) : (host.split(".")[0] ?? host);
}

function build(brand: BrandConfig, topo: Topology) {
  const zone = brand.domains.landing;
  const out: { name: string; type: string; content: string }[] = [];
  const landingCname = topo.landing_cname?.replace(/\.$/, "");
  if (landingCname) {
    // Cloudflare accepts a proxied CNAME at the apex (CNAME flattening).
    out.push({ name: "@", type: "CNAME", content: landingCname });
    out.push({ name: "www", type: "CNAME", content: landingCname });
  }
  for (const s of topo.ecs_surfaces ?? []) {
    const host = brand.domains[s];
    if (!host || !topo.ecs_host) continue;
    out.push({ name: rel(host, zone), type: "A", content: topo.ecs_host });
  }
  for (const s of topo.fly_surfaces ?? []) {
    const host = brand.domains[s];
    if (!host || !landingCname) continue;
    out.push({ name: rel(host, zone), type: "CNAME", content: landingCname });
  }
  if (topo.mail?.provider !== "none" && topo.mail?.records) {
    for (const [n, c] of Object.entries(topo.mail.records)) {
      if (c) out.push({ name: n, type: "CNAME", content: c.replace(/\.$/, "") });
    }
  }
  return { zone, out };
}

async function main() {
  const brand = await loadBrand();
  const topo = loadTopology();
  const { zone, out } = build(brand, topo);
  fs.mkdirSync(DNS_DIR, { recursive: true });
  const lines = [`// GENERATED pnpm dns:render zone=${zone}`, ""];
  // BIND comments use semicolon not //
  const bind = [`; GENERATED pnpm dns:render zone=${zone}`, ""];
  for (const r of out) {
    const c = r.type === "CNAME" && !r.content.endsWith(".") ? `${r.content}.` : r.content;
    bind.push(`${r.name}\tIN\t${r.type}\t${c}`);
  }
  bind.push("");
  const body = bind.join("\n");
  fs.writeFileSync(path.join(DNS_DIR, `${zone}.cf-import.zone`), body);
  fs.writeFileSync(path.join(DNS_DIR, `${zone}.zone`), body);
  console.log(`zone=${zone} records=${out.length}`);
  for (const r of out) console.log(`  ${r.type} ${r.name} ${r.content}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
