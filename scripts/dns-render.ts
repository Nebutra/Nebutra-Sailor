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
  apex_a: string;
  www_cname: string;
  docs_cname: string;
  mail?: { provider: string; records: Record<string, string> };
  ecs_surfaces: DomainKey[];
  /** Brand fronts served by Vercel — CNAME to `www_cname`, no ECS origin. */
  vercel_surfaces?: DomainKey[];
  proxy: { proxied: string[]; dns_only: string[] };
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
  if (process.env.DNS_APEX_A?.trim()) t.apex_a = process.env.DNS_APEX_A.trim();
  if (process.env.DNS_DOCS_CNAME?.trim()) t.docs_cname = process.env.DNS_DOCS_CNAME.trim();
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
  if (topo.apex_a) out.push({ name: "@", type: "A", content: topo.apex_a });
  if (topo.www_cname)
    out.push({ name: "www", type: "CNAME", content: topo.www_cname.replace(/\.$/, "") });
  for (const s of topo.ecs_surfaces ?? []) {
    const host = brand.domains[s];
    if (!host || !topo.ecs_host) continue;
    out.push({ name: rel(host, zone), type: "A", content: topo.ecs_host });
  }
  for (const s of topo.vercel_surfaces ?? []) {
    const host = brand.domains[s];
    if (!host || !topo.www_cname) continue;
    out.push({ name: rel(host, zone), type: "CNAME", content: topo.www_cname.replace(/\.$/, "") });
  }
  if (topo.docs_cname && brand.domains.docs) {
    out.push({
      name: rel(brand.domains.docs, zone),
      type: "CNAME",
      content: topo.docs_cname.replace(/\.$/, ""),
    });
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
