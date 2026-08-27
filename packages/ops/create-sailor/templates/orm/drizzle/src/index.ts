import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * @nebutra/db-drizzle — opt-in Drizzle ORM access layer.
 *
 * Lives alongside the primary Prisma client at @nebutra/db. Both connect to
 * the same DATABASE_URL — Drizzle is for new code that wants the
 * lighter-weight, SQL-shaped query builder; Prisma stays as the entry point
 * for the auth / billing / audit packages that were built on top of it.
 *
 * Migration policy: Prisma owns the schema until the dual-ORM era ends.
 * `drizzle-kit generate` here is for *adding* Drizzle-only tables; existing
 * Prisma tables get mirrored into src/schema/*.ts for read access only.
 */

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("[@nebutra/db-drizzle] DATABASE_URL is not set. Drizzle cannot connect.");
}

const client = postgres(connectionString, {
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  idle_timeout: 30,
  prepare: false,
});

export const db = drizzle(client, { schema, logger: false });
export { schema };
export type Database = typeof db;
