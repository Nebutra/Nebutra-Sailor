// =============================================================================
// Audit provider factory — auto-detects the right backend from the environment
// =============================================================================
// Detection precedence (matches @nebutra/queue, @nebutra/search):
//   1. AUDIT_PROVIDER env var               → explicit override
//   2. CLICKHOUSE_URL + AUDIT_USE_CLICKHOUSE=true → clickhouse
//   3. DATABASE_URL                          → postgres
//   4. (fallback)                            → memory (dev/test only)
// =============================================================================

import { logger } from "@nebutra/logger";
import { MemoryAuditProvider } from "./memory";
import { PostgresAuditProvider, type PrismaAuditDelegate } from "./postgres";
import type { AuditProvider, AuditProviderType } from "./types";

export { ClickHouseAuditProvider } from "./clickhouse";
export { MemoryAuditProvider } from "./memory";
export type { PrismaAuditDelegate } from "./postgres";
export { PostgresAuditProvider } from "./postgres";
export type { AuditProvider, AuditProviderType } from "./types";

export interface AuditFactoryConfig {
  /** Force a specific provider type. Useful for tests. */
  provider?: AuditProviderType;
  /** Required for the postgres provider. Provide the Prisma client. */
  prisma?: PrismaAuditDelegate;
}

function detectProviderType(): AuditProviderType {
  const explicit = process.env.AUDIT_PROVIDER?.trim() as AuditProviderType | undefined;
  if (explicit && ["memory", "postgres", "clickhouse"].includes(explicit)) {
    return explicit;
  }
  if (process.env.CLICKHOUSE_URL && process.env.AUDIT_USE_CLICKHOUSE === "true") {
    return "clickhouse";
  }
  if (process.env.DATABASE_URL) return "postgres";
  return "memory";
}

let cachedProvider: AuditProvider | null = null;

/**
 * Resolve the configured audit provider. Cached after the first call so the
 * provider lifecycle matches the process lifecycle.
 */
export async function getAuditProvider(config: AuditFactoryConfig = {}): Promise<AuditProvider> {
  if (cachedProvider) return cachedProvider;
  cachedProvider = await createAuditProvider(config);
  return cachedProvider;
}

export async function createAuditProvider(config: AuditFactoryConfig = {}): Promise<AuditProvider> {
  const type = config.provider ?? detectProviderType();

  switch (type) {
    case "memory":
      if (process.env.NODE_ENV === "production") {
        logger.warn(
          "[audit] Falling back to in-memory provider in production — events will be lost. Configure DATABASE_URL or AUDIT_PROVIDER.",
        );
      }
      return new MemoryAuditProvider();

    case "postgres": {
      // Host must pass `config.prisma` (e.g. getSystemDb()). Never import
      // private `@nebutra/db` from this package.
      const delegate = config.prisma;
      if (!delegate) {
        logger.warn(
          "[audit] Postgres provider requested but no Prisma client provided — pass config.prisma or use memory",
        );
        return new MemoryAuditProvider();
      }
      return new PostgresAuditProvider(delegate);
    }

    case "clickhouse":
      // ClickHouse provider requires explicit construction by the host app
      // because it owns the @clickhouse/client lifecycle. Fall back to the
      // postgres provider (or memory) if no client is supplied.
      logger.warn(
        "[audit] ClickHouse provider must be constructed explicitly via createClickHouseAuditProvider(). Falling back to postgres.",
      );
      return createAuditProvider({ ...config, provider: "postgres" });

    default:
      return new MemoryAuditProvider();
  }
}

/** @internal — exposed for tests so they can reset the singleton. */
export function __resetAuditProviderForTests(): void {
  cachedProvider = null;
}
