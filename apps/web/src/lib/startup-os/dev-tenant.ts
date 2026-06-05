import { getSystemDb } from "@/lib/db";

/**
 * Dev-only Tenant seeding for the synthetic `AUTH_PROVIDER=dev` session.
 *
 * The dev auth provider (`@nebutra/auth` → `providers/dev.ts`) returns a
 * fixture session whose `organizationId` / `userId` are `dev-org-001` /
 * `dev-user-001`. That tenant row is never seeded by the normal Clerk / Better
 * Auth user-sync path, so any write that carries an `atelier_canvas_tenant_id`
 * FK (e.g. creating a Startup OS project) fails with
 * `Foreign key constraint violated: atelier_canvas_tenant_id_fkey`.
 *
 * `ensureDevTenant` idempotently provisions the fixture Organization, User,
 * membership, and Tenant (id-reuse: Tenant.id == Organization.id ==
 * "dev-org-001") so the FK target exists. It is a no-op-safe upsert and MUST
 * only be called when the configured auth provider is `dev`.
 *
 * RLS note: the Tenant table cannot be written by the tenant-scoped `app_user`
 * role under row-level security. Callers MUST pass a system-scope (BYPASSRLS)
 * client — `getSystemDb()` — which is the default here.
 */

// ─── Fixture ids ──────────────────────────────────────────────────────────────
// Mirrors `DEV_FIXTURE_ORG` / `DEV_FIXTURE_USER` from
// `@nebutra/auth` → `src/providers/dev.ts`. Those constants are not exported
// from a public subpath of `@nebutra/auth`, and that module throws at import
// time when `NODE_ENV === "production"`, so importing it here is neither clean
// nor safe. The values are duplicated as local constants and kept in sync by
// hand; they are stable fixture identifiers that never change.

export const DEV_TENANT_ID = "dev-org-001";
export const DEV_ORGANIZATION_ID = "dev-org-001";
export const DEV_USER_ID = "dev-user-001";
export const DEV_ORGANIZATION_NAME = "Dev Workspace";
export const DEV_ORGANIZATION_SLUG = "dev";
export const DEV_USER_EMAIL = "dev@nebutra.local";
export const DEV_USER_NAME = "Dev User";

// ─── Minimal Prisma delegate surface ──────────────────────────────────────────
// Narrow structural interface so the function is unit-testable with a keyless
// in-memory mock (no real Prisma client, no DB, no network).

interface DevTenantDb {
  readonly organization: {
    upsert(args: {
      where: { id: string };
      create: {
        id: string;
        clerkId: string;
        name: string;
        slug: string;
      };
      update: Record<string, never>;
    }): Promise<unknown>;
  };
  readonly user: {
    upsert(args: {
      where: { id: string };
      create: {
        id: string;
        clerkId: string;
        email: string;
        name: string;
      };
      update: Record<string, never>;
    }): Promise<unknown>;
  };
  readonly organizationMember: {
    upsert(args: {
      where: { organizationId_userId: { organizationId: string; userId: string } };
      create: {
        organizationId: string;
        userId: string;
        role: "OWNER";
      };
      update: Record<string, never>;
    }): Promise<unknown>;
  };
  readonly tenant: {
    upsert(args: {
      where: { id: string };
      create: {
        id: string;
        kind: "ORGANIZATION";
        organizationId: string;
      };
      update: Record<string, never>;
    }): Promise<unknown>;
  };
}

/**
 * Idempotently seed the dev fixture Tenant (and its owning Organization, User,
 * and membership) so foreign-key targets exist for dev-mode writes.
 *
 * Foreign-key order is significant:
 *   1. Organization  — Tenant.organizationId references it
 *   2. User          — OrganizationMember.userId references it
 *   3. OrganizationMember — links the fixture user to the org
 *   4. Tenant        — id-reuse with Organization, references it
 *
 * Every step uses `upsert` with an empty `update`, so repeated calls are safe.
 *
 * @param db System-scope Prisma client (BYPASSRLS). Defaults to `getSystemDb()`.
 */
export async function ensureDevTenant(
  db: DevTenantDb = getSystemDb() as unknown as DevTenantDb,
): Promise<void> {
  // 1. Organization — FK target for both Tenant and OrganizationMember.
  await db.organization.upsert({
    where: { id: DEV_ORGANIZATION_ID },
    create: {
      id: DEV_ORGANIZATION_ID,
      clerkId: DEV_ORGANIZATION_ID,
      name: DEV_ORGANIZATION_NAME,
      slug: DEV_ORGANIZATION_SLUG,
    },
    update: {},
  });

  // 2. User — FK target for OrganizationMember.
  await db.user.upsert({
    where: { id: DEV_USER_ID },
    create: {
      id: DEV_USER_ID,
      clerkId: DEV_USER_ID,
      email: DEV_USER_EMAIL,
      name: DEV_USER_NAME,
    },
    update: {},
  });

  // 3. Membership — make the fixture user the owner of the fixture org.
  await db.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: DEV_ORGANIZATION_ID,
        userId: DEV_USER_ID,
      },
    },
    create: {
      organizationId: DEV_ORGANIZATION_ID,
      userId: DEV_USER_ID,
      role: "OWNER",
    },
    update: {},
  });

  // 4. Tenant — id-reuse (Tenant.id == Organization.id) so existing owning-id
  //    values stay valid as tenant ids; this is the FK target for
  //    AtelierCanvas.tenant_id and every other tenant-scoped data model.
  await db.tenant.upsert({
    where: { id: DEV_TENANT_ID },
    create: {
      id: DEV_TENANT_ID,
      kind: "ORGANIZATION",
      organizationId: DEV_ORGANIZATION_ID,
    },
    update: {},
  });
}
