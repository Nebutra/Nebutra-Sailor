import { logger } from "@nebutra/logger";
import pg from "pg";

export interface PgPoolOptions {
  connectionString: string;
  /** Max connections (default: 10). Rule of thumb: 2× CPU cores + spindles. */
  max?: number;
  /** Kill idle connections after this many ms (default: 30 000). */
  idleTimeoutMillis?: number;
  /** Fail-fast timeout for acquiring a connection (default: 5 000). */
  connectionTimeoutMillis?: number;
}

/**
 * Create a production-ready pg.Pool with sane defaults and an error handler
 * that surfaces pool-level errors without crashing the process.
 *
 * Apps with their own Prisma schemas should use this instead of constructing
 * a Pool directly so that connection settings stay consistent across the
 * monorepo.
 *
 * @example
 * ```ts
 * import { createPgPool } from "@nebutra/db/pool"
 * import { PrismaPg } from "@prisma/adapter-pg"
 * import { PrismaClient } from "../prisma/generated/client"
 *
 * const pool = createPgPool({ connectionString: process.env.DATABASE_URL! })
 * export const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
 * ```
 */
export function createPgPool(options: PgPoolOptions): pg.Pool {
  const pool = new pg.Pool({
    connectionString: options.connectionString,
    max: options.max ?? parseInt(process.env.DB_POOL_MAX ?? "10", 10),
    idleTimeoutMillis:
      options.idleTimeoutMillis ?? parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? "30000", 10),
    connectionTimeoutMillis:
      options.connectionTimeoutMillis ??
      parseInt(process.env.DB_CONNECTION_TIMEOUT_MS ?? "5000", 10),
    allowExitOnIdle: false,
  });

  pool.on("error", (err) => {
    logger.error("[db] Unexpected pool error", err);
  });

  return pool;
}
