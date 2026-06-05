import { logger } from "@nebutra/logger";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const RLS_ROLE = (() => {
  const role = process.env.APP_DB_ROLE;
  return role && /^[a-z_][a-z0-9_]*$/.test(role) ? role : null;
})();

// PostgreSQL statement_timeout (ms) — prevents runaway queries from holding
// locks or exhausting the pool. Applied transaction-locally via
// `SET LOCAL statement_timeout` in getTenantDb (see below), NOT as a connection
// startup parameter. A startup-time `options=-c statement_timeout=…` is rejected
// by transaction-pooling poolers (Neon/Supabase PgBouncer) with
// "unsupported startup parameter in options: statement_timeout", and a session
// `SET` cannot survive a transaction pooler anyway. `SET LOCAL` inside the
// per-query transaction is the only form that works on every topology.
// Override via DB_STATEMENT_TIMEOUT_MS env var (default 30 s).
const STATEMENT_TIMEOUT_MS = (() => {
  const n = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS ?? "30000", 10);
  return Number.isFinite(n) && n >= 0 ? n : 30000;
})();

function createPrismaClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("[db] DATABASE_URL is not set. Cannot initialize database connection pool.");
  }

  // Use connection pool for PostgreSQL with explicit production-ready settings.
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    // Max connections per pool instance.
    // Rule of thumb: (2 × CPU cores) + effective_spindle_count
    // Default 10 is fine for most apps; override via env for large deployments.
    max: parseInt(process.env.DB_POOL_MAX ?? "10", 10),
    // Kill idle connections after 30s to free server-side resources.
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT_MS ?? "30000", 10),
    // Fail fast if we can't get a connection within 5s (avoids hanging requests).
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT_MS ?? "5000", 10),
    // Keep the process alive while there are active connections.
    allowExitOnIdle: false,
  });

  // Surface pool-level errors without crashing the process — Prisma will
  // propagate the error to the caller through normal query failure paths.
  pool.on("error", (err) => {
    logger.error("[db] Unexpected pool error", err);
  });

  const adapter = new PrismaPg(pool);

  const baseClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // The pool is cold on the first request, and getTenantDb wraps EVERY query in
    // a transaction (SET LOCAL ROLE + set_config for RLS). Prisma's default
    // transaction maxWait (2s) is too short to acquire that first connection when
    // the database is a remote pooler (e.g. Supabase ap-southeast-1) — it surfaces
    // as "Unable to start a transaction in the given time". Give it room. Both are
    // env-overridable for tuning per-deployment without a code change.
    transactionOptions: {
      maxWait: parseInt(process.env.DB_TX_MAX_WAIT_MS ?? "10000", 10),
      timeout: parseInt(process.env.DB_TX_TIMEOUT_MS ?? "20000", 10),
    },
  });

  return baseClient.$extends({
    query: {
      integration: {
        async $allOperations({ operation, args, query }) {
          // ── Encrypt on write ───────────────────────────────────────────
          // `credentials` and `settings` are both encrypted at rest with
          // tenant-bound ciphertext. Cross-tenant decryption attempts fail
          // with "Tenant ID mismatch" from the vault provider.
          if (["create", "update", "upsert"].includes(operation)) {
            const { encryptJSON, isEncryptedSecret } = await import("@nebutra/vault");

            const encryptField = async (
              data: Record<string, unknown>,
              field: "credentials" | "settings",
              tenantId: string | undefined,
            ): Promise<void> => {
              const value = data[field];
              if (value === undefined || value === null) return;
              // Already encrypted — don't double-encrypt (e.g. on update
              // where the caller round-tripped the decrypted shape).
              if (isEncryptedSecret(value)) return;
              // Empty credentials object is a legitimate "no secrets yet" state.
              if (
                field === "credentials" &&
                typeof value === "object" &&
                !Array.isArray(value) &&
                Object.keys(value as Record<string, unknown>).length === 0
              ) {
                return;
              }
              data[field] = (await encryptJSON(value, {
                context: {
                  ...(tenantId ? { tenantId } : {}),
                  kind: `integration.${field}`,
                },
              })) as unknown as typeof value;
            };

            const encryptData = async (
              data: Record<string, unknown> | undefined,
            ): Promise<void> => {
              if (!data) return;
              const tenantId =
                typeof data.organizationId === "string" ? data.organizationId : undefined;
              await encryptField(data, "credentials", tenantId);
              await encryptField(data, "settings", tenantId);
            };

            const typedArgs = args as {
              create?: Record<string, unknown>;
              update?: Record<string, unknown>;
              data?: Record<string, unknown>;
            };

            if (operation === "upsert") {
              await encryptData(typedArgs.create);
              await encryptData(typedArgs.update);
            } else if (typedArgs.data) {
              await encryptData(typedArgs.data);
            }
          }

          // Execute query
          const result = await query(args);

          // ── Decrypt on read ────────────────────────────────────────────
          if (result) {
            const { decryptJSON, isEncryptedSecret } = await import("@nebutra/vault");

            const decryptField = async (
              record: Record<string, unknown>,
              field: "credentials" | "settings",
            ): Promise<void> => {
              const value = record[field];
              if (!isEncryptedSecret(value)) return;
              const tenantId =
                typeof record.organizationId === "string" ? record.organizationId : undefined;
              try {
                record[field] = (await decryptJSON(value, {
                  context: tenantId ? { tenantId } : {},
                })) as unknown as typeof value;
              } catch (err) {
                logger.warn(`[db] Failed to decrypt integration.${field}`, {
                  error: err instanceof Error ? err.message : String(err),
                  integrationId: typeof record.id === "string" ? record.id : undefined,
                });
                // On decrypt failure, null out rather than leaking ciphertext.
                record[field] = null;
              }
            };

            const decryptRecord = async (record: unknown): Promise<void> => {
              if (!record || typeof record !== "object") return;
              const r = record as Record<string, unknown>;
              await decryptField(r, "credentials");
              await decryptField(r, "settings");
            };

            if (Array.isArray(result)) {
              await Promise.all(result.map(decryptRecord));
            } else {
              await decryptRecord(result);
            }
          }

          return result as unknown as typeof result;
        },
      },
    },
  }) as unknown as PrismaClient; // Cast to retain type compatibility if needed, or let Prisma infer it
}

// Lazy singleton — the client is NOT created on import, only on first property
// access. This prevents build-time errors in Next.js when DATABASE_URL is not
// available (e.g. during `next build` on CI/Vercel before env vars are injected
// into the running process).
let _client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (!_client) {
    _client = globalForPrisma.prisma ?? createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = _client;
    }
  }
  return _client;
}

/**
 * Lazy proxy over the base Prisma client. Internal to this package — exported
 * only through `getSystemDb()` and `getTenantDb()` so callers make an explicit
 * choice between tenant-scoped and system-scope access.
 */
const baseClient: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    return Reflect.get(getClient(), prop);
  },
});

// =============================================================================
// Tenant-scoped client factory
// =============================================================================

/**
 * Get a tenant-scoped Prisma client for the given `tenantId`.
 *
 * Every query issued through the returned client runs inside a transaction
 * that first sets the PostgreSQL session variable `app.current_tenant_id`, which
 * the row-level security (RLS) policies in migration `20260313000000_enable_rls`
 * use to filter tenant-scoped tables. This guarantees that even a query that
 * forgets to include `where: { tenantId }` cannot read or mutate rows
 * belonging to another tenant.
 *
 * Callers should derive `tenantId` from the request-scoped tenant context,
 * compatibility organization sessions, or trusted service-token claims — never
 * from client-controlled input.
 *
 * @example
 * ```ts
 * import { getTenantDb } from "@nebutra/db";
 *
 * app.get("/projects", async (c) => {
 *   const tenantId = c.get("tenant").tenantId;
 *   const db = getTenantDb(tenantId);
 *   const projects = await db.project.findMany();
 *   return c.json(projects);
 * });
 * ```
 */
export function getTenantDb(tenantId: string): PrismaClient {
  if (!tenantId || typeof tenantId !== "string") {
    throw new Error(
      "[db] getTenantDb() requires a non-empty tenantId. Did you mean to call getSystemDb()?",
    );
  }

  const client = getClient();

  // Prisma v5+ $extends hook. Each query runs inside a short-lived transaction
  // whose first statement sets `app.current_tenant_id` so RLS policies filter
  // rows to this tenant for the remainder of the transaction. The session
  // variable is transaction-local (3rd arg = true), so it clears automatically.
  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // `STATEMENT_TIMEOUT_MS` is a validated non-negative integer, so it is
          // safe to interpolate into the SET LOCAL (which cannot be bind-parameterized).
          if (RLS_ROLE) {
            const [, , , result] = await client.$transaction([
              client.$executeRawUnsafe(`SET LOCAL ROLE "${RLS_ROLE}"`),
              client.$executeRawUnsafe(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`),
              client.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`,
              query(args),
            ]);
            return result as unknown;
          }

          const [, , result] = await client.$transaction([
            client.$executeRawUnsafe(`SET LOCAL statement_timeout = ${STATEMENT_TIMEOUT_MS}`),
            client.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`,
            query(args),
          ]);
          return result as unknown;
        },
      },
    },
  }) as unknown as PrismaClient;
}

/**
 * ESCAPE HATCH — returns the bare Prisma client with NO tenant RLS filter.
 *
 * Use this ONLY for:
 * - Webhook handlers that lack a tenant context (Stripe, Clerk, etc.) and
 *   must look up the tenant from the webhook payload.
 * - Admin / cross-tenant operations (admin dashboard, platform usage reports).
 * - Background jobs that process events for arbitrary tenants.
 * - Auth bootstrap (first-user / first-org creation before a tenant exists).
 * - Health checks, migrations, and other system-level operations.
 *
 * Whenever you call this from a request handler, add a comment of the form
 *
 *     // AUDIT(no-tenant): <short reason>
 *
 * on the line above the call so the reason is reviewable. A lint rule may be
 * added to flag undocumented calls in the future.
 *
 * @example
 * ```ts
 * // AUDIT(no-tenant): Stripe webhook payload is the sole source of truth
 * // for the organization; there is no request-scoped tenant context.
 * const db = getSystemDb();
 * const sub = await db.subscription.updateMany({ where: { stripeId }, data });
 * ```
 */
export function getSystemDb(): PrismaClient {
  return baseClient;
}

export type { PrismaClient };
