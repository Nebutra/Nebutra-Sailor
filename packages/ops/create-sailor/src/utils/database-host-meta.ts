/**
 * Database host (managed-provider) registry — separate from engine choice.
 *
 * `--db` already selects the Prisma engine (postgresql | mysql | sqlite).
 * `--db-host` selects WHERE the database runs. Same engine, very different
 * provisioning + env-var shape + Prisma settings. Examples:
 *
 *   --db=postgres --db-host=supabase
 *     → Supabase pooler URL, anon/service keys for the ecosystem.
 *
 *   --db=postgres --db-host=neon
 *     → Neon pooled + direct URL pair, prismaSchema.directUrl wired up.
 *
 *   --db-host=planetscale
 *     → forces engine to mysql, adds relationMode = "prisma" (PlanetScale
 *       doesn't support foreign keys).
 *
 * Setting `--db-host` overrides `--db` engine for hosts that hard-pin one.
 */

export type DatabaseHostId =
  | "local" // Docker / self-hosted; standard DATABASE_URL only
  | "supabase" // Managed Postgres + auth/storage/realtime ecosystem
  | "neon" // Serverless Postgres with branching + scale-to-zero
  | "vercel-postgres" // Vercel-managed Neon, with marketplace auto-injection
  | "planetscale" // Managed MySQL with branching; no FK support
  | "railway" // Generalist managed infra (TCP Postgres)
  | "aliyun-rds" // Aliyun RDS for CN region
  | "tencent-cdb" // Tencent CloudDB for CN region
  | "none"; // No DB scaffolding (mirrors --db=none)

export type DatabaseHostRegion = "global" | "cn" | "both";

export type DatabaseHostEngine = "postgresql" | "mysql" | "sqlite";

export interface DatabaseHostMeta {
  id: DatabaseHostId;
  name: string;
  region: DatabaseHostRegion;

  /**
   * The Prisma engine this host serves. If set, the host forces that engine
   * regardless of the `--db` flag (e.g. PlanetScale = mysql).
   */
  forcedEngine?: DatabaseHostEngine;

  /** Engines the host is known to support (informational; pinned via forcedEngine). */
  supportedEngines: DatabaseHostEngine[];

  /** Env vars to inject into .env.example. Value is a placeholder template. */
  envVars: Array<{ name: string; placeholder: string; comment?: string }>;

  /**
   * Prisma schema mutations beyond engine swap. e.g. PlanetScale needs
   * relationMode = "prisma" inside `datasource db { ... }`.
   */
  prismaDatasourceExtras?: string[];

  /** Whether to keep `directUrl = env("DIRECT_URL")` (Neon, Vercel Postgres). */
  keepDirectUrl?: boolean;

  /** Docs URL for the host. */
  docs: string;

  /** Short marketing description (shown in interactive prompt). */
  description: string;

  /**
   * Whether this host is "managed" (third-party SaaS) vs "self-hosted" (you
   * operate the DB). Used to nudge users about ops burden.
   */
  tier: "managed" | "self-hosted";
}

export const DATABASE_HOSTS: DatabaseHostMeta[] = [
  {
    id: "local",
    name: "Local / Self-hosted Docker",
    region: "both",
    supportedEngines: ["postgresql", "mysql", "sqlite"],
    envVars: [
      {
        name: "DATABASE_URL",
        placeholder: "postgresql://postgres:postgres@localhost:5432/$PROJECT",
        comment: "Local Postgres via docker-compose (pnpm infra:up)",
      },
    ],
    docs: "https://www.postgresql.org/docs/",
    description: "Docker on localhost. You operate it.",
    tier: "self-hosted",
  },
  {
    id: "supabase",
    name: "Supabase",
    region: "global",
    supportedEngines: ["postgresql"],
    forcedEngine: "postgresql",
    keepDirectUrl: true,
    envVars: [
      {
        name: "DATABASE_URL",
        placeholder:
          "postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true",
        comment: "Supabase pooler — use for runtime queries",
      },
      {
        name: "DIRECT_URL",
        placeholder:
          "postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres",
        comment: "Supabase direct — use for Prisma migrations",
      },
      { name: "NEXT_PUBLIC_SUPABASE_URL", placeholder: "https://<project>.supabase.co" },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", placeholder: "" },
      { name: "SUPABASE_SERVICE_ROLE_KEY", placeholder: "" },
    ],
    docs: "https://supabase.com/docs",
    description: "Managed Postgres + auth/storage/realtime/edge-functions.",
    tier: "managed",
  },
  {
    id: "neon",
    name: "Neon",
    region: "global",
    supportedEngines: ["postgresql"],
    forcedEngine: "postgresql",
    keepDirectUrl: true,
    envVars: [
      {
        name: "DATABASE_URL",
        placeholder:
          "postgresql://<user>:<pwd>@ep-<branch>-pooler.<region>.neon.tech/<db>?sslmode=require",
        comment: "Neon pooled — runtime queries",
      },
      {
        name: "DIRECT_URL",
        placeholder:
          "postgresql://<user>:<pwd>@ep-<branch>.<region>.neon.tech/<db>?sslmode=require",
        comment: "Neon direct (no -pooler) — migrations",
      },
    ],
    docs: "https://neon.tech/docs",
    description: "Serverless Postgres with branching and scale-to-zero.",
    tier: "managed",
  },
  {
    id: "vercel-postgres",
    name: "Vercel Postgres",
    region: "global",
    supportedEngines: ["postgresql"],
    forcedEngine: "postgresql",
    keepDirectUrl: true,
    envVars: [
      {
        name: "DATABASE_URL",
        placeholder: "$POSTGRES_PRISMA_URL",
        comment: "Vercel Marketplace injects POSTGRES_PRISMA_URL automatically",
      },
      {
        name: "DIRECT_URL",
        placeholder: "$POSTGRES_URL_NON_POOLING",
        comment: "Vercel Marketplace injects POSTGRES_URL_NON_POOLING automatically",
      },
    ],
    docs: "https://vercel.com/docs/storage/vercel-postgres",
    description: "Neon-backed, auto-provisioned via Vercel Marketplace.",
    tier: "managed",
  },
  {
    id: "planetscale",
    name: "PlanetScale",
    region: "global",
    supportedEngines: ["mysql"],
    forcedEngine: "mysql",
    prismaDatasourceExtras: ['relationMode = "prisma"'],
    envVars: [
      {
        name: "DATABASE_URL",
        placeholder: "mysql://<user>:<pass>@<host>.psdb.cloud/<db>?sslaccept=strict",
        comment: 'PlanetScale: relationMode = "prisma" (no FK support server-side)',
      },
    ],
    docs: "https://planetscale.com/docs",
    description: "Managed MySQL with branching. No foreign keys.",
    tier: "managed",
  },
  {
    id: "railway",
    name: "Railway",
    region: "global",
    supportedEngines: ["postgresql", "mysql"],
    envVars: [
      {
        name: "DATABASE_URL",
        placeholder: "$DATABASE_URL",
        comment: "Railway service env var; injected when you link a Postgres service",
      },
    ],
    docs: "https://docs.railway.app/databases/postgresql",
    description: "Generalist managed infra; standard TCP Postgres/MySQL.",
    tier: "managed",
  },
  {
    id: "aliyun-rds",
    name: "Aliyun RDS",
    region: "cn",
    supportedEngines: ["postgresql", "mysql"],
    envVars: [
      {
        name: "DATABASE_URL",
        placeholder: "postgresql://<user>:<pwd>@<rds-instance>.rds.aliyuncs.com:5432/<db>",
        comment: "Aliyun RDS Postgres — internal VPC endpoint recommended",
      },
    ],
    docs: "https://www.alibabacloud.com/help/en/rds",
    description: "Aliyun RDS — China compliance + intranet routing.",
    tier: "managed",
  },
  {
    id: "tencent-cdb",
    name: "Tencent CloudDB (CDB)",
    region: "cn",
    supportedEngines: ["mysql", "postgresql"],
    envVars: [
      {
        name: "DATABASE_URL",
        placeholder: "mysql://<user>:<pwd>@<cdb-instance>.tencentcdb.com:3306/<db>",
        comment: "Tencent CloudDB — VPC endpoint recommended",
      },
    ],
    docs: "https://intl.cloud.tencent.com/document/product/236",
    description: "Tencent CloudDB — China compliance.",
    tier: "managed",
  },
  {
    id: "none",
    name: "None",
    region: "both",
    supportedEngines: ["postgresql", "mysql", "sqlite"],
    envVars: [],
    docs: "",
    description: "Skip database scaffolding.",
    tier: "self-hosted",
  },
];

export function getDatabaseHost(id: string): DatabaseHostMeta | undefined {
  return DATABASE_HOSTS.find((h) => h.id === id);
}

/**
 * Smart default host per region.
 *
 * - global → supabase (most full-featured starter; auth+storage in one decision)
 * - cn     → local    (compliance-friendly; user picks aliyun-rds / tencent-cdb explicitly)
 * - hybrid → local    (deployable both sides without vendor lock)
 */
export function defaultDatabaseHost(region: string): DatabaseHostId {
  if (region === "cn") return "local";
  if (region === "hybrid") return "local";
  return "supabase";
}
