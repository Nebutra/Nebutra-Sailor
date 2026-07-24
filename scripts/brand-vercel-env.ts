// Rewrite app vercel.json env from brand.domains (used by brand:apply).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BrandConfig } from "./brand-types";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const biomeBin = path.join(ROOT, "node_modules/.bin/biome");

function toHttps(host: string): string {
  return `https://${host.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
}

function toCookieDomain(landing: string): string {
  const apex = landing.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return apex.startsWith(".") ? apex : `.${apex}`;
}

export function buildVercelEnvPatches(config: BrandConfig): Record<string, Record<string, string>> {
  const d = config.domains;
  const c = toCookieDomain(d.landing);
  const landing = toHttps(d.landing);
  const app = toHttps(d.app);
  const api = toHttps(d.api);
  const auth = toHttps(d.auth);
  const docs = toHttps(d.docs);
  const router = toHttps(d.router);
  const forge = toHttps(d.forge);
  const shared = {
    NEXT_PUBLIC_AUTH_URL: auth,
    NEXT_PUBLIC_AUTH_PROVIDER: "better-auth",
    AUTH_PROVIDER: "better-auth",
    BETTER_AUTH_URL: auth,
    AUTH_COOKIE_DOMAIN: c,
    NEBUTRA_LANDING_ORIGIN: landing,
    NEBUTRA_SESSION_HINT_DOMAIN: c,
  };
  return {
    "apps/landing/vercel.json": {
      NEXT_PUBLIC_SITE_URL: landing,
      NEXT_PUBLIC_APP_URL: app,
      NEXT_PUBLIC_API_URL: api,
      NEXT_PUBLIC_DOCS_URL: docs,
      DOCS_ORIGIN_URL: docs,
    },
    "apps/web/vercel.json": {
      NEXT_PUBLIC_SITE_URL: app,
      NEXT_PUBLIC_APP_URL: app,
      NEXT_PUBLIC_API_URL: api,
      ...shared,
    },
    "apps/auth/vercel.json": {
      NEXT_PUBLIC_SITE_URL: landing,
      NEXT_PUBLIC_APP_URL: app,
      NEXT_PUBLIC_AUTH_URL: auth,
      AUTH_PROVIDER: "better-auth",
      NEXT_PUBLIC_AUTH_PROVIDER: "better-auth",
      BETTER_AUTH_URL: auth,
      AUTH_COOKIE_DOMAIN: c,
    },
    "apps/router/vercel.json": {
      NEXT_PUBLIC_SITE_URL: router,
      NEXT_PUBLIC_APP_URL: router,
      NEXT_PUBLIC_ROUTER_URL: router,
      NEXT_PUBLIC_ROUTER_API_BASE: `${router}/v1`,
      NEXT_PUBLIC_API_URL: api,
      ...shared,
      ROUTER_LISTING_MODE: "auto",
    },
    "apps/forge/vercel.json": {
      NEXT_PUBLIC_SITE_URL: forge,
      NEXT_PUBLIC_APP_URL: forge,
      NEXT_PUBLIC_FORGE_URL: forge,
      NEXT_PUBLIC_ROUTER_URL: router,
      NEXT_PUBLIC_API_URL: api,
      ...shared,
    },
  };
}

export function updateVercelEnvFromBrand(config: BrandConfig): void {
  const written: string[] = [];
  for (const [rel, patch] of Object.entries(buildVercelEnvPatches(config))) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) continue;
    const json = JSON.parse(fs.readFileSync(full, "utf-8")) as {
      env?: Record<string, string>;
      rewrites?: Array<{ source: string; destination: string }>;
    };
    json.env = { ...(json.env ?? {}), ...patch };
    if (json.rewrites) {
      json.rewrites = json.rewrites.map((r) =>
        r.destination?.startsWith("http")
          ? {
              ...r,
              destination: r.destination.replace(/^https?:\/\/[^/]+/, toHttps(config.domains.api)),
            }
          : r,
      );
    }
    // JSON.stringify expands short arrays; Biome prefers compact ["iad1"].
    fs.writeFileSync(full, `${JSON.stringify(json, null, 2)}\n`);
    written.push(full);
    console.log(`  vercel env from brand: ${rel}`);
  }
  if (written.length > 0 && fs.existsSync(biomeBin)) {
    const fmt = spawnSync(biomeBin, ["format", "--write", ...written], {
      cwd: ROOT,
      encoding: "utf8",
    });
    if (fmt.status !== 0) {
      throw new Error(fmt.stderr || fmt.stdout || "biome format failed on vercel.json");
    }
  }
}
