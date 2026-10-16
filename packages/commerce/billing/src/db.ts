/**
 * Host-injected tenant DB accessor for billing.
 * This package never imports private `@nebutra/db` (or generated Prisma types).
 */

/** Minimal JSON value for Prisma Json columns. */
export type InputJsonValue =
  | string
  | number
  | boolean
  | null
  | { readonly [key: string]: InputJsonValue | undefined }
  | readonly InputJsonValue[];

/**
 * Host Prisma client is treated as a structural black box.
 * Call sites already know the query shapes; typing them fully would re-couple
 * this package to the monorepo schema.
 */
// biome-ignore lint/suspicious/noExplicitAny: host-injected Prisma client surface
export type BillingTenantDb = any;

type TenantDbGetter = (organizationId: string) => unknown;

/**
 * The getter lives on `globalThis`, not in module scope. Next compiles
 * `instrumentation.ts` (where the host wires it) and each route into separate
 * module graphs, and `@nebutra/billing` is transpiled into every graph, so a
 * module-level `let` set at bootstrap was never seen by the route that read it:
 * `/api/billing/credits/summary` answered 500 and `/usage` showed "credit
 * balance unavailable" on every render.
 */
const GETTER_KEY = Symbol.for("@nebutra/billing/tenant-db-getter");
type GetterHolder = { [GETTER_KEY]?: TenantDbGetter | undefined };
const holder = globalThis as GetterHolder;

/**
 * Wire host-owned tenant Prisma (e.g. `getTenantDb` from `@nebutra/db`).
 */
export function configureBillingTenantDb(getTenantDb: TenantDbGetter): void {
  holder[GETTER_KEY] = getTenantDb;
}

/** @internal — tests */
export function __resetBillingTenantDbForTests(): void {
  holder[GETTER_KEY] = undefined;
}

export function requireTenantDb(organizationId: string): BillingTenantDb {
  const getter = holder[GETTER_KEY];
  if (!getter) {
    throw new Error(
      "@nebutra/billing requires a host tenant DB. Call configureBillingTenantDb(getTenantDb) at app bootstrap.",
    );
  }
  return getter(organizationId) as BillingTenantDb;
}

/** True when a Prisma unique-constraint error (P2002) is detected. */
export function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
