# RFC B1/B4/B6: Gate Tenant Supertype Cutover With Authorization and RLS Evidence

Status: Proposed
Date: 2026-06-02
Dimensions: B1 technical debt and legacy architecture, B4 security architecture, B6 test blind spots

## Delta Scope

This proposal covers material changes observed after the 2026-06-01 governance run: Model-2 tenancy moved from a planning document into schema, route, RLS, and generated Prisma surfaces.

No code, configuration, CI rule, permission, or access-control setting was changed by this review.

## Current State

- `docs/architecture/2026-06-02-tenancy-tenant-supertype-model-2.md` defines the target model: `Tenant` as the isolation supertype for `Organization` and individual `User`.
- `packages/platform/db/prisma/schema.prisma` now contains `TenantKind`, `Tenant`, and many business models retargeted from `organizationId` to `tenantId`.
- The same schema intentionally reuses organization IDs as tenant IDs for organization tenants, which reduces immediate migration cost but preserves a naming ambiguity at call sites.
- `infra/data/database/policies/rls.sql` has Model-2 tenant policies for many tables, but organization membership, invitations, and organizations still use `organization_id` or `id` directly.
- `packages/iam/tenant/src/isolation.ts` still defaults generated RLS policies to `organization_id`, and `packages/iam/tenant/src/isolation.test.ts` snapshots that default.
- `packages/platform/db/src/client.ts` still exposes `getTenantDb(organizationId: string)` and documents `organizationId` as the scoped value, even though the RLS variable is now semantically `Tenant.id`.
- Gateway middleware still models the request as `{ userId, organizationId, role, plan }`. `requireOrganization` and `requireRole` reject org-less requests, which blocks first-class individual tenant flows by design.
- New and migrated gateway route handlers frequently cast `tenant.organizationId as string`, then write `tenantId: organizationId`. This is safe only while organization tenant ID reuse remains guaranteed.
- Web auth still exposes `requireOrg()` as the main protected-surface guard and redirects org-less users to `/select-org`.
- API keys, billing, usage, notifications, integrations, and Startup OS routes are now at risk of mixing "organization id" and "tenant id" semantics unless the migration contract is explicit and tested.

## Architectural Tradeoffs

Option A: rename request and database APIs to tenant-first contracts before broader product work.

- Pros: makes individual tenants possible without semantic lying, reduces future authorization drift, and aligns RLS, Prisma, route handlers, and audit metadata.
- Cons: touches many call sites and may slow feature work while auth/session flows are still mixed between Clerk, Better Auth, and service tokens.

Option B: keep organization ID reuse as a compatibility bridge for one release window.

- Pros: preserves existing org-scoped routes and lowers short-term migration risk.
- Cons: every new route must remember that `organizationId` may actually mean `tenantId`, and individual tenant support remains easy to mis-implement.

Option C: freeze individual-tenant product paths until organization Model-2 is fully proven.

- Pros: easiest way to avoid accidental privilege or RLS drift during the cutover.
- Cons: conflicts with the Startup OS direction where solo founders and individual spaces are first-class product concepts.

Recommended direction: Option B only as a bounded bridge, with an explicit cutover ledger and fail-loud tests before individual tenant features become customer-visible.

## Decision Information Needed

- Whether organization tenant IDs must continue to equal organization IDs permanently, or only during the bridge period.
- Canonical request context shape: keep `organizationId`, add `tenantId`, or replace with `{ tenantId, tenantKind, organizationId?, userId? }`.
- Individual tenant authorization semantics: owner-only implicit permissions, synthetic role, or CASL/OpenFGA subject relation.
- Whether `requireOrganization` remains a valid guard name, or must split into `requireTenant` and `requireOrganizationTenant`.
- Which tables are intentionally public/system-wide under RLS, and which still need tenant policy generation.
- Whether Prisma migration history or `infra/data/database/policies/rls.sql` is the source of truth for RLS policy deployment.
- A route inventory of system-scope `getSystemDb()` usage with owner, reason, and whether a tenant-scoped alternative exists.
- Test evidence required before enabling individual tenant data writes: API key CRUD, billing/credits, usage ledger, notifications, integrations, Startup OS, audit logs, and webhook backfills.

## Proposed Decision Path

1. Create a Tenant Cutover Matrix with rows for schema column, Prisma field, RLS policy, request context field, route guard, audit field, tests, and owner.
2. Mark each route family as organization-only, tenant-generic, individual-only, or system-scope.
3. Decide if `getTenantDb` accepts a semantic `tenantId` now, while compatibility helpers continue to derive tenant IDs from organization sessions.
4. Make RLS generation fail-loud when a Model-2 table still emits `organization_id` by default.
5. Add cross-tenant and org-less individual fixtures before shipping individual tenant writes.
6. Defer any permission expansion until the current org-only paths have proof that RLS and app-layer authorization agree.

## Security Stop Condition

This review did not identify a candidate hardcoded secret in the inspected tenant/security files. If follow-up work finds a suspected real token, connection string, or private key, stop that item and report only the file and location.

## Non-Goals

- This RFC does not rename `getTenantDb`, `requireOrg`, `requireOrganization`, or any Prisma field.
- This RFC does not grant permissions, create accounts, or change tenant provisioning.
- This RFC does not suppress failing tests, loosen type checks, or change CI behavior.
