# Cofounder Form-Team (OPC → Org) + License Carry-over — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax. Build task-by-task; commit after each task; never `git add -A` (concurrent sessions share this tree — stage explicit paths only).

**Goal:** Turn a mutual cofounder match into a real team — the initiator's one-person company (Individual Tenant) becomes a shared Organization, the compiled company carries over with an unbroken audit trail, the matched cofounder is invited, and the Sailor commercial-exemption license carries into the team tenant.

**Architecture:** Realizes the `organization_owned` transition from `docs/proposals/2026-06-03-personal-to-workspace-tenant-lifecycle.md` on the existing Tenant Model-2 (Tenant kind=INDIVIDUAL|ORGANIZATION, id-reuse, `tenant_id` everywhere, RLS via `app.current_tenant_id`). The hard constraint: **organization Tenants are provisioned asynchronously** — `createOrganization` (Clerk/provider) fires `organization.created` → gateway inngest `tenantProvisioning` creates `Tenant(kind=ORGANIZATION)`. A synchronous in-request asset transfer would race that webhook, so form-team is **intent → async execution**: the request records a transfer journal + creates the org + invites the cofounder; the asset re-pointing executes once the org tenant exists (webhook-driven), reading the journal. No implicit copy; whole-CompanyContext/whole-project transfer only (proposal risk mitigation).

**Tech Stack:** Next route handlers (apps/web), Prisma 7 + additive migration (schema-to-schema diff), `@nebutra/audit`, `@nebutra/auth` provider org APIs, gateway inngest, Vitest.

---

## File Structure

- `packages/platform/db/prisma/schema.prisma` — add `TenantLifecycleState` enum, `Tenant.lifecycleState`, `TenantTransferJournal` model (additive).
- `packages/platform/db/prisma/migrations/<ts>_add_tenant_lifecycle/migration.sql` — additive DDL; RLS noted for deploy.
- `apps/web/src/lib/cofounder/form-team.ts` — pure orchestration helpers (eligibility, journal payload), unit-testable.
- `apps/web/src/lib/cofounder/__tests__/form-team.test.ts` — eligibility + journal payload tests.
- `apps/web/src/app/api/cofounder/room/[profileId]/form-team/route.ts` — POST: validate match + paid + ownership, create org, write journal (status=pending), invite cofounder.
- `backends/gateway/src/inngest/functions/tenantProvisioning.ts` — after org Tenant exists, drain pending `TenantTransferJournal` rows for that org: re-point the named project/CompanyContext `tenantId`, carry license, mark journal `applied`, audit each step.
- `apps/web/src/components/cofounder-match/room-view.tsx` — wire the real "Form the team" action + states (pending/applied).
- `packages/iam/license` (or existing license carry path) — grant the team tenant the Sailor commercial-exemption (P5).

---

## Task 1: Tenant lifecycle + transfer journal schema (additive)

**Files:** `schema.prisma`, new migration, regenerate client.

- [ ] Add `enum TenantLifecycleState { personal_draft personal_paid workspace_ready organization_owned @@schema("public") }`.
- [ ] Add to `Tenant`: `lifecycleState TenantLifecycleState @default(personal_draft) @map("lifecycle_state")` + back-relation `transferJournalsOut`/`transferJournalsIn`.
- [ ] Add `model TenantTransferJournal` — `id`, `fromTenantId`, `toTenantId` (nullable until org provisioned), `toOrganizationId` (Clerk org id, known pre-provision), `kind` (`company_context`|`startup_project`|`license`), `subjectId` (project/context id), `status` (`pending`|`applied`|`failed`), `initiatedByUserId`, `cofounderProfileId`, `createdAt`, `appliedAt?`, `error?`. Indexes on `(toOrganizationId, status)` and `(fromTenantId)`. `@@schema("public")`.
- [ ] Generate migration via `prisma migrate diff --from-schema <HEAD schema> --to-schema prisma/schema.prisma --script` (schema-to-schema; no shadow db). Schema-qualify objects to match existing migrations. Note RLS policies for `tenant_transfer_journals` in the migration header (own-tenant read of rows you initiated; service-role writes during provisioning).
- [ ] `pnpm --filter @nebutra/db db:generate`; commit schema + migration + regenerated client (explicit paths).

## Task 2: form-team orchestration helpers (pure, TDD)

**Files:** `lib/cofounder/form-team.ts`, `__tests__/form-team.test.ts`.

- [ ] Test: `assertFormTeamEligible({ isMatch, initiatorPaid, isInitiatorOwnerOfProject })` → throws typed errors for non-match / unpaid / non-owner; passes when all true.
- [ ] Test: `buildTransferJournalEntries({ fromTenantId, toOrganizationId, projectId, cofounderProfileId, userId })` → returns `company_context` + `startup_project` + `license` pending entries (no copy, just intent rows).
- [ ] Implement to green. Commit.

## Task 3: form-team API route

**Files:** `api/cofounder/room/[profileId]/form-team/route.ts`.

- [ ] POST: reuse `getCofounderContext` (project:create); validate the `profileId` is a real mutual match (listMatches) and `hasActivePlan` (paywall parity with the Room). 409 if not opted-in, 403 if unpaid, 404 if not a match.
- [ ] Resolve the cofounder's email from `User` by the matched profile's `userId` (for the invitation).
- [ ] Create the Organization via the provider path (factor the org-creation helper out of `api/organizations/route.ts` to avoid duplication) — name/slug derived from the company.
- [ ] Write `TenantTransferJournal` rows (status=pending) keyed by the new `toOrganizationId`.
- [ ] Invite the cofounder (factor the invite path out of `onboarding/invite-members/route.ts`).
- [ ] `auditLogger`: `cofounder.team.formed` (the transfer-journal audit event the proposal asks for).
- [ ] Return `{ organizationId, status: "forming" }`. Commit.

## Task 4: async transfer execution in tenantProvisioning

**Files:** `backends/gateway/src/inngest/functions/tenantProvisioning.ts`.

- [ ] After the org `Tenant` is provisioned, query pending `TenantTransferJournal` for `toOrganizationId`; set `toTenantId`.
- [ ] For each entry, in a tenant transaction: re-point the named `AtelierCanvas` (Startup OS project) + its records from `fromTenantId` to `toTenantId` (whole-project only); carry the license; mark `applied` + `appliedAt`; audit each. On failure mark `failed` + `error` (no partial silent loss).
- [ ] Set `Tenant.lifecycleState = organization_owned` for the org; `workspace_ready` already set at form-team time for the source. Commit.

## Task 5: License carry-over (P5)

**Files:** license grant path.

- [ ] On the `license` journal entry, grant the new org tenant the Sailor commercial-exemption (same grant web signup/CLI confers). Idempotent. Test. Commit.

## Task 6: Room UI wiring + honest states

**Files:** `components/cofounder-match/room-view.tsx`.

- [ ] Replace the "coming next" placeholder with a real "Form the team" button (paid + match only) → POST form-team → show "forming" → on next load reflect `organization_owned` (switch to the new org / link to it).
- [ ] Honest states: forming (async), formed (link to team), failed (retry). Commit.

## Review Loop

- [ ] Dispatch a plan-document-reviewer on this plan + the proposal before executing Task 3+ (the tenancy-mutating tasks).
- [ ] Regression tests (proposal): individual-tenant access, org-tenant access, cross-tenant denial, billing subject switch, audit trail unbroken across the transfer.
