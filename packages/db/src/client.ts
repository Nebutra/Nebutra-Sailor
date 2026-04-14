import { logger } from "@nebutra/logger";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "./generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

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

  // Set PostgreSQL statement_timeout on every new connection.
  // This prevents runaway queries from holding locks or exhausting the pool.
  // Override via DB_STATEMENT_TIMEOUT_MS env var (default 30 s).
  const statementTimeout = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS ?? "30000", 10);
  pool.on("connect", (client) => {
    client.query(`SET statement_timeout = ${statementTimeout}`).catch((err: unknown) => {
      logger.error("[db] Failed to set statement_timeout", err);
    });
  });

  const adapter = new PrismaPg(pool);

  const baseClient = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  return baseClient.$extends({
    query: {
      integration: {
        async $allOperations({ operation, args, query }) {
          // Encrypt on write
          if (["create", "update", "upsert"].includes(operation)) {
            const vault = await import("@nebutra/vault").then((m) => m.getVault());
            if (operation === "upsert" && args.create && args.update) {
              if ((args.create as any).credentials) {
                (args.create as any).credentials = await vault.encrypt(
                  JSON.stringify((args.create as any).credentials),
                );
              }
              if ((args.update as any).credentials) {
                (args.update as any).credentials = await vault.encrypt(
                  JSON.stringify((args.update as any).credentials),
                );
              }
            } else if ((args as any).data?.credentials) {
              (args as any).data.credentials = await vault.encrypt(
                JSON.stringify((args as any).data.credentials),
              );
            }
          }

          // Execute query
          const result = await query(args);

          // Decrypt on read
          if (result) {
            const decryptRecord = async (record: any) => {
              if (
                record?.credentials &&
                typeof record.credentials === "object" &&
                "ciphertext" in record.credentials &&
                "encryptedDek" in record.credentials
              ) {
                try {
                  const vault = await import("@nebutra/vault").then((m) => m.getVault());
                  const decrypted = await vault.decrypt(record.credentials as any);
                  record.credentials = JSON.parse(decrypted);
                } catch (err) {
                  logger.warn("[db] Failed to decrypt integration credentials", {
                    error: err instanceof Error ? err.message : String(err),
                  });
                }
              }
            };

            if (Array.isArray(result)) {
              await Promise.all(result.map(decryptRecord));
            } else {
              await decryptRecord(result);
            }
          }

          return result as any;
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

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    return Reflect.get(getClient(), prop);
  },
});

export type { PrismaClient };
