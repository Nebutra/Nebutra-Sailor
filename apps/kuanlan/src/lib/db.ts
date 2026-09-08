import "server-only";

import { getSystemDb, getTenantDb, type PrismaClient } from "@nebutra/db";
import { UserRepository } from "@nebutra/repositories";

/**
 * 观澜's first database seam.
 *
 * Until now this app had no database at all: Moments were whatever an R2
 * listing said, and nothing could answer "how many has this person taken" or
 * "which one failed". The roadmap's P1 — async `Task` rows, credits, refund on
 * failure — all keys on a tenant, so the tenant is what this file establishes.
 *
 * The connection is PlanetScale Postgres through the PgBouncer pooled
 * `DATABASE_URL` (Fly has no Hyperdrive), and `@nebutra/db` reaches it through
 * `@prisma/adapter-pg` — a driver adapter, so there is no Rust engine binary to
 * carry into the standalone image. `web`, `auth` and `admin` already ship this
 * way through the same Fly pipeline.
 *
 * Fails closed without `DATABASE_URL`, like R2 and the router already do: a
 * missing store is refused, never silently skipped.
 */

export class DbUnavailableError extends Error {
  constructor(message = "db_unconfigured") {
    super(message);
    this.name = "DbUnavailableError";
  }
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function requireDb(): void {
  if (!isDbConfigured()) {
    throw new DbUnavailableError();
  }
}

/** Same shape the Moments prefix accepts — a user id is a plain token or nothing. */
const USER_ID = /^[a-zA-Z0-9_-]+$/;

export class InvalidUserIdError extends Error {
  constructor() {
    super("invalid_user_id");
    this.name = "InvalidUserIdError";
  }
}

export type PersonalTenant = { tenantId: string; userId: string };

type UpsertTenant = (args: {
  where: { userId: string };
  create: { kind: "INDIVIDUAL"; userId: string };
  update: Record<string, never>;
  select: { id: true; userId: true };
}) => Promise<{ id: string; userId: string | null }>;

/** The signed-in person, as much of them as the row needs. A `Session` fits. */
export type PersonalIdentity = { userId: string; email?: string | null };

type EnsureUser = (who: { userId: string; email?: string }) => Promise<void>;

/**
 * Every person gets one tenant of their own, and this is where it comes from.
 *
 * `CreditBalance.tenantId` is `@unique` — credits are per tenant, not per user —
 * while 观澜 is a product for individuals. The roadmap resolved that by giving
 * each person a tenant rather than migrating the billing tables, and the schema
 * had already anticipated it: `Tenant.kind` has `INDIVIDUAL`, `Tenant.userId`
 * is `@unique`, and `lifecycleState` defaults to `personal_draft`. So this is
 * one upsert, idempotent under concurrency because the uniqueness lives in the
 * database rather than in a check-then-insert here.
 *
 * Goes through `getSystemDb()` on purpose. The tenants table is what tenant
 * scoping is *derived from*; there is no tenant to scope to before the row
 * exists. Everything downstream of this uses `tenantDbFor` and is scoped.
 */
export async function ensurePersonalTenant(
  identity: PersonalIdentity,
  io: { upsert?: UpsertTenant; ensureUser?: EnsureUser } = {},
): Promise<PersonalTenant> {
  requireDb();
  const { userId } = identity;
  if (!USER_ID.test(userId)) {
    throw new InvalidUserIdError();
  }

  const upsert: UpsertTenant =
    io.upsert ?? ((args) => getSystemDb().tenant.upsert(args as never) as never);
  const ensureUser: EnsureUser =
    io.ensureUser ??
    (async (who) => {
      await new UserRepository(getSystemDb()).ensureFromIdentity({
        id: who.userId,
        email: who.email ?? null,
      });
    });

  // `Tenant.userId` references `users`, and Better Auth never wrote that table
  // — it keeps its own. The platform mirrors new sign-ups from a hook; this is
  // the lazy half, for anyone who signed up before the hook existed. One
  // upsert, before the row that needs it.
  await ensureUser({ userId, email: identity.email ?? undefined });

  const row = await upsert({
    where: { userId },
    create: { kind: "INDIVIDUAL", userId },
    update: {},
    select: { id: true, userId: true },
  });

  return { tenantId: row.id, userId };
}

/**
 * A tenant-scoped client for this person: ensures the tenant, then hands back a
 * client that runs every query under `SET LOCAL ROLE app_user` with the tenant
 * id bound. This is the seam the P1 work (Task rows, credits) builds on.
 *
 * The role probe inside `getTenantDb` runs on first use per process and throws
 * `[db] APP_DB_ROLE …` if `app_user` is not assumable on this connection. That
 * surfaces here as a thrown error, per request — it does not stop the app from
 * starting, and the health route reports it as `roleUsable: false`.
 */
export async function tenantDbFor(identity: PersonalIdentity): Promise<{
  db: PrismaClient;
  tenant: PersonalTenant;
}> {
  const tenant = await ensurePersonalTenant(identity);
  return { db: getTenantDb(tenant.tenantId), tenant };
}
