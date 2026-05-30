/**
 * Pure mapping/resolver functions — translate raw CLI flag strings into
 * typed NebutraConfig values and region-aware defaults.
 *
 * No side-effects, no I/O.  All output is consumed by resolve-config.ts.
 */

import pc from "picocolors";
import type { AuthChoice } from "../utils/auth";
import type { DocsFramework, NebutraConfig, Region } from "../utils/config";
import {
  DATABASE_HOSTS,
  type DatabaseHostId,
  defaultDatabaseHost,
  getDatabaseHost,
} from "../utils/database-host-meta";
import type { PaymentChoice } from "../utils/payment";
import { normalizeStorageProviderId } from "../utils/storage-meta";
import type { RegionDefaults } from "./types";

// ---------------------------------------------------------------------------
// Package-manager detection
// ---------------------------------------------------------------------------

export function detectPm(): "npm" | "pnpm" | "yarn" | "bun" {
  const ua = process.env.npm_config_user_agent ?? "";
  if (ua.startsWith("pnpm")) return "pnpm";
  if (ua.startsWith("yarn")) return "yarn";
  if (ua.startsWith("bun")) return "bun";
  return "npm";
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

export function mapDb(d: string | undefined): NebutraConfig["database"] {
  switch (d) {
    case "postgres":
    case "postgresql":
      return "postgresql";
    case "mysql":
      return "mysql";
    case "sqlite":
      return "sqlite";
    case "none":
      return "none";
    default:
      return "postgresql";
  }
}

/**
 * Resolve --db-host from CLI input + region fallback. If the host pins an
 * engine (PlanetScale = mysql), this returns BOTH host id and the engine
 * override the caller should apply to mapDb's result.
 */
export function resolveDatabaseHost(
  hostArg: string | undefined,
  region: string,
  engineFromDb: NebutraConfig["database"],
): {
  hostId: DatabaseHostId;
  engine: NebutraConfig["database"];
} {
  const candidateId = hostArg?.trim().toLowerCase() ?? defaultDatabaseHost(region);
  const meta = getDatabaseHost(candidateId);
  if (!meta) {
    const validIds = DATABASE_HOSTS.map((h) => h.id).join(", ");
    throw new Error(`Unknown --db-host="${candidateId}". Valid: ${validIds}`);
  }

  // Host forces engine? Override engineFromDb.
  let engine = engineFromDb;
  if (meta.forcedEngine && engine !== "none" && engine !== meta.forcedEngine) {
    engine = meta.forcedEngine;
  }
  return { hostId: meta.id, engine };
}

// ---------------------------------------------------------------------------
// ORM
// ---------------------------------------------------------------------------

export function mapOrm(o: string | undefined): NebutraConfig["orm"] {
  // `prisma` (default) = Prisma only, the historical scaffold shape.
  // `drizzle`          = dual-ORM mode — Prisma stays primary, a second
  //                      `db-drizzle` package is added alongside for new
  //                      code that prefers the Drizzle DSL. See
  //                      packages/ops/create-sailor/src/utils/orm.ts.
  // `none`             = treated as prisma; we don't ship a no-ORM variant.
  if (o === "drizzle") return "drizzle";
  return "prisma";
}

// ---------------------------------------------------------------------------
// Payment
// ---------------------------------------------------------------------------

export function mapPayment(p: string | undefined): NebutraConfig["payment"] {
  if (p === "lemon" || p === "lemonsqueezy") return "lemon";
  if (p === "wechat") return "wechat";
  if (p === "alipay") return "alipay";
  if (p === "none") return "none";
  return "stripe";
}

/**
 * Resolve the raw --payment CLI value to a PaymentChoice that preserves the
 * full provider granularity needed by `applyPaymentSelection` (wechat/alipay
 * are not collapsed into "stripe").
 */
export function resolvePaymentChoice(raw: string | undefined): PaymentChoice {
  if (!raw) return "stripe";
  const v = raw.toLowerCase();
  if (v === "lemon" || v === "lemonsqueezy") return "lemon";
  if (v === "wechat") return "wechat";
  if (v === "alipay") return "alipay";
  if (v === "none") return "none";
  return "stripe";
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Resolve the raw --auth CLI value to an AuthChoice.
 */
export function resolveAuthChoice(raw: string | undefined): AuthChoice {
  if (!raw) return "clerk";
  const v = raw.toLowerCase();
  if (v === "betterauth" || v === "better-auth") return "betterauth";
  if (v === "nextauth" || v === "next-auth" || v === "authjs" || v === "auth.js") return "nextauth";
  if (v === "supabase" || v === "supabase-auth") return "supabase";
  if (v === "none") return "none";
  return "clerk";
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

const AI_TOPOLOGY_MODES = new Set(["gateway", "direct", "custom", "none"]);

/** Topology shorthand: `--ai=gateway|direct|custom|none` map to a mode, not provider IDs. */
export function isAiTopologyShorthand(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  return AI_TOPOLOGY_MODES.has(trimmed);
}

export function mapAi(ids: string | undefined): string[] {
  if (!ids) return ["openai"];
  // Topology shorthand: let resolveAiTopology pick the seed from defaults.
  if (isAiTopologyShorthand(ids)) return [];
  const list = ids.split(",").map((s) => s.trim().toLowerCase());
  if (list.includes("none")) return [];
  return list;
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

export function resolveStorageChoice(raw: string | undefined, fallback: string): string {
  const value = raw ?? fallback;
  return normalizeStorageProviderId(value) ?? value;
}

// ---------------------------------------------------------------------------
// Docs
// ---------------------------------------------------------------------------

const DOCS_COMING_SOON: Record<string, string> = {
  mintlify: "Mintlify",
  docusaurus: "Docusaurus",
  nextra: "Nextra",
  vitepress: "VitePress",
};

export function resolveDocs(raw: string | undefined, useJson: boolean): DocsFramework {
  if (!raw) return "fumadocs";
  const v = raw.toLowerCase();
  if (v === "fumadocs" || v === "none") return v;
  if (v in DOCS_COMING_SOON) {
    const label = DOCS_COMING_SOON[v];
    if (!useJson) {
      process.stdout.write(
        pc.yellow(`⚠  ${label} support is coming in v1.2. Falling back to fumadocs.\n`) +
          pc.dim("   Track progress: https://github.com/Nebutra/Nebutra-Sailor/issues\n"),
      );
    } else {
      process.stdout.write(
        JSON.stringify({
          event: "notice",
          kind: "docs-fallback",
          requested: v,
          effective: "fumadocs",
        }) + "\n",
      );
    }
    return "fumadocs";
  }
  return "fumadocs";
}

// ---------------------------------------------------------------------------
// Deploy
// ---------------------------------------------------------------------------

export function mapDeploy(d: string | undefined): NebutraConfig["deployTarget"] {
  switch (d) {
    case "vercel":
      return "vercel";
    case "railway":
      return "railway";
    case "cloudflare":
      return "cloudflare";
    case "selfhost":
      return "selfhost";
    case "none":
      return "none";
    default:
      return "vercel";
  }
}

// ---------------------------------------------------------------------------
// Region
// ---------------------------------------------------------------------------

export function resolveRegion(raw: string | undefined): Region {
  if (!raw) return "global";
  const v = raw.toLowerCase();
  if (v === "cn") return "cn";
  if (v === "hybrid") return "hybrid";
  return "global";
}

export function regionDefaults(region: Region): RegionDefaults {
  const base = (() => {
    if (region === "cn") {
      return {
        email: "aliyun-dm",
        storage: "aliyun-oss",
        monitoring: "sentry",
        analytics: "baidu",
        sms: "aliyun-sms",
      };
    }
    if (region === "hybrid") {
      return {
        email: "resend",
        storage: "aliyun-oss",
        monitoring: "sentry",
        analytics: "posthog",
        sms: "aliyun-sms",
      };
    }
    // global
    return {
      email: "resend",
      storage: "r2",
      monitoring: "sentry",
      analytics: "posthog",
      sms: "twilio",
    };
  })();

  return {
    ...base,
    queue: "none", // opt-in, no default
    search: "none", // opt-in
    cache: region === "global" ? "upstash-redis" : region === "cn" ? "redis" : "upstash-redis",
    notifications: "none",
    webhooks: "none",
    cms: "none",
    featureFlags: "none",
    // `@nebutra/captcha` adapters (turnstile / hcaptcha / aliyun-slide) are
    // still WIP per docs/package-status.md. Default to `none` so a fresh
    // scaffold never ships an "[WIP]" surface the user did not opt into;
    // they can flip it on explicitly via `--captcha=turnstile`.
    captcha: "none",
    mcp: "on", // Sailor core value
    metering: "auto", // auto-enable if payment is set
    billingMode: "usage", // all regions default to usage-based billing
    idp: "clerk", // all regions default — users pick oauth-server explicitly if self-hosting IDP
    accessGate: "none", // opt-in: do not ship cold-start business tables by default
  };
}

export function defaultPaymentForRegion(region: Region): string {
  return region === "cn" ? "wechat" : "stripe";
}
