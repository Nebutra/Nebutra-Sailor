# ADR: Invitation Table Consolidation — `public.OrganizationInvitation` vs `auth.invitation`

- **Date**: 2026-05-12
- **Status**: **Proposed**
- **Owner**: tseka_luk
- **Supersedes**: nothing — first ADR for invitation surface
- **Related**: [`2026-05-10-auth-provider-abstraction-wave2.md`](./2026-05-10-auth-provider-abstraction-wave2.md) — Wave 2 D3 schema strategy carved out the new `auth.invitation` table

---

## Context

Two invitation tables exist in the same Postgres database, populated by different code paths:

| Table | Schema | Owner | Shape |
|---|---|---|---|
| `public.OrganizationInvitation` | `public` | Clerk-era hand-rolled invite flow | `email`, `organizationId`, `role` (default "member"), `status` (`pending`/`accepted`/`declined`/`expired`), `inviterId`, `token` (UNIQUE), `expiresAt` (NOT NULL), `acceptedAt?`, `declinedAt?`, `createdAt` |
| `auth.invitation` | `auth` | Better Auth `organization` plugin | `email`, `inviterId`, `organizationId`, `role?`, `status` (default "pending"), `expiresAt?` — FK CASCADE to `auth.organization`; indexed by `email` |

Both serve "user A invites user B to org X via email" but with **different fields, different ownership, and different lifecycles**. As of 2026-05-12 both are written to: legacy app code writes `public.OrganizationInvitation`; Better Auth's org plugin writes `auth.invitation` whenever Phase 2 UI flows are exercised with the org capability flag on.

This is a **dual-write hazard** the longer it persists.

---

## Field-level diff

| Field | `public.OrganizationInvitation` | `auth.invitation` | Notes |
|---|---|---|---|
| `id` | cuid PK | cuid PK | identical |
| `email` | NOT NULL | NOT NULL | identical |
| `organizationId` | NOT NULL, no FK | NOT NULL, FK CASCADE | BA enforces referential integrity |
| `inviterId` | NOT NULL | NOT NULL | identical |
| `role` | NOT NULL default `"member"` | NULLABLE | BA's plugin treats role as optional |
| `status` | NOT NULL default `"pending"` | NOT NULL default `"pending"` | identical |
| `token` | UNIQUE NOT NULL | **MISSING** | Used by legacy email link `/accept?token=...` flow |
| `expiresAt` | NOT NULL | NULLABLE | BA does not require expiry |
| `acceptedAt` | nullable timestamp | **MISSING** | Audit trail only — BA tracks via `status` transition |
| `declinedAt` | nullable timestamp | **MISSING** | Same |
| `createdAt` | NOT NULL default now() | **MISSING** | BA omits |

**Capability gap**: `auth.invitation` is missing 4 fields the legacy app relies on for: (1) email-link accept flows (`token`), (2) explicit expiry enforcement (`expiresAt` NOT NULL), (3) admin-side audit (`acceptedAt` / `declinedAt` / `createdAt`).

---

## Options

### Option A — Adopt `auth.invitation` as canonical, extend with missing fields

Add `token`, `acceptedAt`, `declinedAt`, `createdAt`, and tighten `expiresAt` to NOT NULL on `auth.invitation`. Migrate `public.OrganizationInvitation` data, then drop the legacy table.

**Pros:**
- One source of truth aligned with BA org plugin (gets BA upgrades for free)
- FK CASCADE keeps invitations consistent when orgs are deleted
- Single hot path for new code

**Cons:**
- BA's `auth.api.createInvitation` may not populate the added columns automatically — we'd need a `databaseHooks.invitation.create.after` to backfill `token` and `createdAt`
- Schema migration involves data movement (one-time downtime window OR dual-write deprecation period)
- BA upstream changes to the `invitation` plugin schema could regress our extra columns; need a regression test that asserts our columns survive a plugin upgrade

### Option B — Keep `public.OrganizationInvitation` canonical, retire `auth.invitation`

Disable BA's `organization` plugin invitation API; route all invitation calls through the legacy `apps/web` invite endpoints which write `public.OrganizationInvitation`. Drop `auth.invitation` table.

**Pros:**
- Legacy code keeps working unchanged; richer schema preserved
- No coupling to BA's plugin shape (insulated from upstream churn)

**Cons:**
- We lose BA's plugin-driven flows (acceptInvite UI, email templating done by plugin, etc.)
- The Phase 2.5 `OrganizationCapability.invite/acceptInvite` API would need a custom adapter that bypasses BA — defeats the point of the canonical interface
- Sets a precedent that we don't trust BA's plugin tables, opens the door to forking every BA plugin table

### Option C — Dual-table, separate concerns (status quo formalized)

Keep both tables. Document that:
- `auth.invitation` is the **operational** table BA writes when its org plugin runs invitation flows; transient
- `public.OrganizationInvitation` is the **business** table with audit trail, email-link tokens, expiry SLAs; durable
- After BA emits an invitation, a `databaseHooks.invitation.create.after` hook copies the row into `public.OrganizationInvitation` with the extra fields populated; accept/decline flows write back to BOTH

**Pros:**
- No data migration; both tables work today
- Clear separation: BA owns the plugin contract, app owns the business record
- Aligns with D3 Shape B precedent ("existing tables stay where they are")

**Cons:**
- Dual-write complexity at the app/hook layer
- Two tables to query when answering "what invitations does this user have"
- Operational risk: a hook failure leaves the two tables out of sync; need reconciliation

---

## Decision

**Option A — adopt `auth.invitation` as canonical**, extend with the missing fields, migrate legacy data, drop `public.OrganizationInvitation`.

**Rationale:**
- The capability gap (4 missing fields) is straightforward to close with additive ALTER TABLE migrations
- `databaseHooks.invitation.create.after` is a well-established BA pattern (already used in this repo for audit events per `packages/iam/auth/src/audit-events.ts`)
- Single source of truth eliminates dual-write hazard
- FK CASCADE matches the org-deletion semantics we want
- Long-term coupling cost (BA upstream schema churn) is bounded — `BAInvitation` is small enough to fork if needed
- Matches the "hard but right" principle: short-term schema work for long-term cleanliness, rather than the comfortable status quo of two tables

**Explicitly rejected:**
- **Option B**: forking BA's plugin shape sets a bad precedent. If we don't trust BA enough to use its invitation table, we should not use BA at all.
- **Option C**: dual-write looks attractive today but rots — every new field needs to be added in two places forever, and a hook failure is silent.

---

## Migration plan

5 phases, additive-only first, irreversible drop last:

### Phase 1 — Additive schema migration (`auth.invitation` gains the missing fields)

- ALTER TABLE `auth.invitation` ADD:
  - `token TEXT` (will become UNIQUE NOT NULL in Phase 3)
  - `accepted_at TIMESTAMP NULL`
  - `declined_at TIMESTAMP NULL`
  - `created_at TIMESTAMP NOT NULL DEFAULT NOW()`
- Update `expiresAt` to NOT NULL? **No, defer to Phase 3** — keep nullable during the dual-write period
- Reversible. Zero behavior change.

### Phase 2 — Wire BA database hooks to populate the new fields

- Extend `packages/iam/auth/src/audit-events.ts` (or a new `invitation-hooks.ts`) with `databaseHooks.invitation.create.before` that:
  - Generates a `token` (32-byte hex via `crypto.randomBytes`)
  - Sets `expires_at` to `now() + 7 days` if BA didn't pass one
- Reversible by removing the hook.

### Phase 3 — Backfill legacy invitations + start dual-read

- One-time backfill script: for each `public.OrganizationInvitation`, INSERT into `auth.invitation` with same email/org/role/status, preserving `token`, `acceptedAt`, `declinedAt`, `createdAt`.
- Tighten `auth.invitation.token` to UNIQUE NOT NULL.
- App code starts **reading from `auth.invitation`** for accept-by-token flows; legacy writes to `public.OrganizationInvitation` continue (dual-write).
- Add a contract test asserting field parity post-backfill.

### Phase 4 — Switch writes to `auth.invitation` only

- All new invitations go through `auth.organizations.invite()` (canonical interface) which writes `auth.invitation`. The hooks from Phase 2 backfill the new fields.
- `public.OrganizationInvitation` is now read-only (legacy data only).
- 30-day soak period to catch any forgotten code paths.

### Phase 5 — Drop `public.OrganizationInvitation`

- After soak, audit zero writes to `public.OrganizationInvitation` for 30 days (Postgres log analysis or hook-level instrumentation).
- DROP TABLE `public.OrganizationInvitation`.
- This is the only **irreversible** step. All earlier phases revert via reverse migration.

---

## Open questions

1. **Token generation: hook vs Prisma `@default`?** Prisma can generate cuids via `@default(cuid())`, but `token` is a security primitive — must be high-entropy random bytes, not cuid. Hook-based generation is correct; the schema field just needs UNIQUE NOT NULL when we tighten.

2. **BA upstream schema migration risk**: when BA bumps to 1.6+, will it ADD columns or RENAME `auth.invitation` fields? The audit hook is brittle to renames. Mitigation: pin BA version in `pnpm-workspace.yaml` catalog; manual upgrade with regression test of invitation flows.

3. **Multi-org users**: `public.OrganizationInvitation` has no UNIQUE constraint on `(email, organizationId)` — a user could be invited twice to the same org. `auth.invitation` also doesn't. **Defer to product**: do we allow re-invitation? If yes, status-based dedupe in app code. If no, add UNIQUE constraint in Phase 1.

---

## Sign-off

- [ ] tseka_luk reviewed & accepted
- [ ] Phase 1 dispatched
- [ ] Phase 2 dispatched
- [ ] Phase 3 dispatched (backfill — needs maintenance window confirmation)
- [ ] Phase 4 dispatched
- [ ] Phase 5 dispatched (irreversible drop — needs explicit ack)
