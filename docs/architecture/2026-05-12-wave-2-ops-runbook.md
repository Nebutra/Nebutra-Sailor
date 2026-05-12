# Wave 2 Auth Refactor — Operations Runbook

- **Date**: 2026-05-12
- **Status**: **Active** — code-complete; this runbook drives the remaining production rollout decisions
- **Owner**: tseka_luk + operations
- **Related**: [`2026-05-10-auth-provider-abstraction-wave2.md`](./2026-05-10-auth-provider-abstraction-wave2.md), [`2026-05-12-invitation-table-consolidation.md`](./2026-05-12-invitation-table-consolidation.md)

---

## What this document is

Wave 2 (and ADR-12 Phase 1-3) shipped all the code. The remaining work needs **operations decisions** — when to flip flags, when to take maintenance windows, when to drop tables. This runbook is the contract between engineering ("here's what's safe to do") and ops ("when do we do it").

If you're an engineer reading this for context: **don't run anything in this runbook autonomously**. Every section has a "decision required" gate that is a human call.

---

## Section A — Wave 2 production gradual rollout

**Code state**: complete. `apps/web` UI for passkeys / 2FA / org-switcher / org-members is gated by `isAuthFeatureEnabled` (env → `@nebutra/feature-flags`). Today in production all flags default false → UI renders as it did before Wave 2.

**Goal**: light up `auth.organizations` first (lowest-risk; org switching already worked client-side via Clerk legacy). Then `auth.twoFactor`, `auth.passkeys`, `auth.magicLink` as separate cohorts.

### A.1 — Configure prod feature-flags evaluator

The default provider is `dbProvider` which reads from Redis. Requirements:
- `REDIS_URL` is set in prod env (already true — `@nebutra/cache` consumes the same)
- The provider is initialized in app startup. Verify by looking at `apps/web/instrumentation.ts` (or equivalent) for `useDbProvider()` call. If missing, add one in a small commit before rolling out — `dbProvider` is the default but explicit init shows intent.

**Decision required**: confirm Redis URL is reachable from prod app pods. Standard sanity check before anything else.

### A.2 — Set initial flag values

Each `AUTH_*` flag is a Redis key under `sailor:ff:<flag-name>`. Manual setup once per env:

```bash
# Connect to prod Redis. Use whatever your standard prod access is — kubectl, bastion, etc.
# DO NOT do this from a dev machine with prod creds in shell history.

# Step 1: set up the flag with a default OFF
redis-cli SET "sailor:ff:auth.organizations" false EX 0   # 0 = never expire

# Step 2: when ready for staff cohort, override per-tenant via the @nebutra/feature-flags percentage helper.
# The dbProvider's evaluator already checks context.tenantId — see packages/platform/feature-flags/src/index.ts:30+.
```

**Decision required**: who has prod Redis CLI access; document it here when known.

### A.3 — Cohort rollout schedule

| Step | Audience | Flag value | Duration | Watch for |
|---|---|---|---|---|
| Day 0 | Internal staff org only (`org_nebutra_team`) | `true` for that tenantId only | 7 days | BA `setActiveOrganization` 500s; `Set-Cookie` propagation failures; org-switcher dropdown rendering bugs |
| Day 7 | 10% of paying orgs | `percentage: 10` via `isEnabledForPercentage` | 7 days | Same as above; bounce-rate on `/settings/organization/members` |
| Day 14 | 50% | bump to 50 | 5 days | error-rate vs baseline |
| Day 19 | 100% | bump to 100 | — | — |
| Day 26 | Remove `NEXT_PUBLIC_AUTH_*` env override fallback | — | — | confirm zero dev/preview envs still rely on it |

Do `auth.organizations` first. Wait 30 days clean before starting `auth.twoFactor` (same schedule). Then `auth.passkeys`. `auth.magicLink` last (depends on `@nebutra/email` being ready).

**Decision required**: cohort sizes are estimates; ops picks the actual ones based on traffic shape.

### A.4 — Rollback

Each step is reversible by setting the flag back. The Set-Cookie rotation from BA's `setActiveOrganization` lasts for the session's lifetime — flipping the flag mid-session means the user keeps using BA until their next sign-in. No data corruption.

**Hard rollback** (if BA itself is broken): set `AUTH_PROVIDER=clerk` in env, redeploy. The 5 Clerk-direct code paths (per Phase 3.3 audit) take over. This is the kill-switch built into `getConfiguredAuthProvider()`.

---

## Section B — ADR-12 invitation migration

**Code state**: Phase 1 (schema additive) + Phase 2 (BA hooks) + Phase 3a (backfill script) + Phase 3b (dual-read) — all merged. New invitations from this point forward write to `auth.invitation` (via BA org plugin); legacy `public.OrganizationInvitation` still receives writes from `apps/web/src/app/api/organizations/[orgId]/members/route.ts` + `apps/web/src/app/api/onboarding/invite-members/route.ts`.

**Goal**: backfill legacy rows → `auth.invitation`, cut writes, drop legacy table.

### B.1 — Phase 3a backfill execution

```bash
# Staging — every command idempotent; safe to re-run if interrupted.
pnpm --filter @nebutra/db exec tsx scripts/backfill-ba-invitation.ts --dry-run
# Inspect: total legacy count, already-present count, would-migrate count, skipped count
# Should match expectations — if not, abort and investigate

pnpm --filter @nebutra/db exec tsx scripts/backfill-ba-invitation.ts --limit 1000
# Verify with: SELECT COUNT(*) FROM auth.invitation WHERE created_at > now() - interval '1 hour';
# Compare against the migrate count from the script's stdout

pnpm --filter @nebutra/db exec tsx scripts/backfill-ba-invitation.ts
# Full run — no limit

# Production — same sequence, separate maintenance window.
# Idempotent — safe to re-run if interrupted.
```

**Decision required**: when to schedule the maintenance window. Backfill is read-from-legacy + write-to-new — no downtime needed for the legacy table, but the new table will receive writes during the window so plan for ~10% lock contention on `auth.invitation`.

### B.2 — Phase 3 closure: backfill validation

After backfill, run this sanity SQL in prod:

```sql
-- Row-count parity (legacy rows that should have a BA counterpart)
SELECT
  (SELECT COUNT(*) FROM public.organization_invitation) AS legacy_total,
  (SELECT COUNT(DISTINCT (email, organization_id)) FROM public.organization_invitation) AS legacy_unique_keys,
  (SELECT COUNT(*) FROM auth.invitation) AS ba_total,
  (SELECT COUNT(*) FROM auth.invitation WHERE token IS NOT NULL) AS ba_with_token;

-- Status integrity (no row jumped status in the migration)
SELECT legacy.status, COUNT(*)
FROM public.organization_invitation legacy
LEFT JOIN auth.invitation ba ON ba.email = legacy.email AND ba.organization_id = legacy.organization_id
WHERE ba.id IS NULL
GROUP BY legacy.status;
-- Expected: rows here are dedupe-losers (same email+org but older createdAt). Spot-check 3-5.
```

**Decision required**: signoff that `legacy_total ≈ ba_total + dedupe_losers`. If not, investigate before Phase 4.

### B.3 — Phase 4 — write cutover (NOT yet shipped)

Code changes needed (not autonomous — needs a separate session/agent dispatch after ops decision):

1. In `apps/web/src/app/api/organizations/[orgId]/members/route.ts`: replace `db.organizationInvitation.create(...)` with `auth.organizations.invite(...)` (canonical Phase 1.3 interface — BA writes to `auth.invitation`)
2. In `apps/web/src/app/api/onboarding/invite-members/route.ts`: same pattern
3. `public.OrganizationInvitation` becomes read-only (legacy only)
4. 30-day soak — monitor: zero new INSERTs into `public.organization_invitation` (Postgres pg_stat_user_tables or a trigger-based audit)

**Decision required**: schedule this for after Section A.4 stable production rollout of `auth.organizations` (otherwise we'd be inviting people whose BA-flow isn't enabled yet). Earliest realistic: ~30 days after Section A.4 hits 100%.

### B.4 — Phase 5 — DROP TABLE (IRREVERSIBLE)

After 30 days of zero writes to `public.organization_invitation`:

```sql
-- One-time, irreversible. Make a logical pg_dump backup of the table first.
DROP TABLE public.organization_invitation;
```

Migration script: `pnpm --filter @nebutra/db exec prisma migrate dev --name drop_legacy_organization_invitation` then commit + deploy.

**Decision required — EXPLICIT ack from owner**: this is the only step in the entire Wave 2 closeout that destroys data. Owner must explicitly authorize the maintenance window AND the DROP. No autonomous agent will run this.

---

## Section C — Smoke-test checklist (post each rollout step)

After every flag flip or maintenance window action, verify:

- [ ] `/settings/security` loads for a user; gated blocks render correctly
- [ ] `/settings/organization/members` loads; list / invite / remove all 200
- [ ] Top-nav `<OrgSwitcher />` shows current org; switching persists across page reload (Set-Cookie wire)
- [ ] `pnpm --filter @nebutra/auth test` 125/125 (regression guard for capability shapes)
- [ ] `pnpm --filter @nebutra/web test` 709/709 (regression guard for dual-read + UI)
- [ ] `pnpm --filter @nebutra/db test` 33/33 (regression guard for schema + backfill)
- [ ] Sentry: zero new auth.* error patterns
- [ ] Grafana: `/api/organizations/active` p95 < 200ms (BA setActive + Set-Cookie write)

---

## Section D — What's deployed today (state as of 2026-05-12)

| Wave / Phase | Status | Commit(s) |
|---|---|---|
| W2 Phase 1.1 — schema additive (4 BA tables) | ✅ shipped | `61f656a0` |
| W2 Phase 1.2 — signIn/signOut/capabilities | ✅ shipped | `e00476ee` + `6fb3cbcb` |
| W2 Phase 1.3 — capability shapes | ✅ shipped | `823b92df` |
| W2 Phase 2.1 — tenant `fromAuthSession` resolver | ✅ shipped | `9230c87a` |
| W2 Phase 2.2 — dual-source feature flag | ✅ shipped | `cc3cda44` + `40288bee` + `6acc7c92` |
| W2 Phase 2.3 — setActive returns `{ headers }` | ✅ shipped | `419d29f2` |
| W2 Phase 2.4 — security UI flag gating | ✅ shipped | `494210fd` |
| W2 Phase 2.5 — switcher + members + setActive consumer | ✅ shipped | `9911e6b5` |
| W2 Phase 2.6 — OrgSwitcher mount + stale test cleanup | ✅ shipped | `2490d8c5` |
| W2 Phase 3.1 — feature-flags AUTH_* in FLAGS | ✅ shipped | `587b5cb4` |
| W2 Phase 3.2 — D4 contract test | ✅ shipped | `f8b0d76c` |
| W2 Phase 3.3 — provider env centralization | ✅ shipped | `b27f8aa1` |
| W2 Phase 3.4 — ADR-12 written | ✅ shipped | `fc7fe60b` |
| W2 Phase 3.5 — prod feature-flag rollout | ⏸️ awaiting ops | this doc § A |
| ADR-12 Phase 1 — extend `auth.invitation` schema | ✅ shipped | `a69852f5` |
| ADR-12 Phase 2 — BA hooks populate token/expiresAt | ✅ shipped | `22750ea5` |
| ADR-12 Phase 3a — backfill script | ✅ shipped | `02fcf9cb` |
| ADR-12 Phase 3b — dual-read | ✅ shipped | `f1239340` + audit `becd90c9` |
| ADR-12 Phase 3 — backfill execution | ⏸️ awaiting ops | this doc § B.1 |
| ADR-12 Phase 4 — write cutover | ⏸️ awaiting ops | this doc § B.3 |
| ADR-12 Phase 5 — DROP TABLE | ⏸️ awaiting ops + explicit ack | this doc § B.4 |

**Total test net**: `@nebutra/auth` 43 → **125** (+82). `@nebutra/web` ~640 → **709** (+69). `@nebutra/db` 0 → **33** (+33). `@nebutra/tenant` 18 → **25** (+7). `@nebutra/oauth-server` 0 → **7** (+7). 27 consumer files unchanged — zero regression.

---

## Section E — Known unknowns

1. **Operations access surface**: this runbook assumes ops has Redis CLI + Postgres write access. If those need provisioning, that's a prerequisite for everything.
2. **`@nebutra/feature-flags` percentage hash** uses tenantId as the hash input. If a tenant migrates between cohorts (rare), they could see UI flip-flop. Mitigation: keep cohort boundaries stable; bump cohort % monotonically.
3. **D4 contract gap** (oauth-server emits `nebutra:organization_name` + `nebutra:organization_slug` but `NebutraIdentityAdapter` drops them) — documented in `f8b0d76c`'s test. Not a Wave 2 blocker. Decision: extend canonical, OR trim emitted claims. Defer until a real oauth-server consumer appears.
4. **Multi-session staging contamination** — 4 incidents across Wave 2 (Phases 1.1, 1.3, 2.2, 3b). Pattern is real. Memory file `feedback_multi_session_coordination.md` captures the playbook. Future agent dispatches should serialize against other sessions on the same path subtree.

---

## Sign-off

- [x] tseka_luk reviewed & accepted (code-complete sections W2 Phase 1–3.4 and ADR-12 Phase 1–3)
- [ ] Section A — prod feature-flag rollout — schedule confirmed
- [ ] Section B.1 — backfill maintenance window — schedule confirmed
- [ ] Section B.2 — backfill validation — signoff
- [ ] Section B.3 — write cutover — dispatched
- [ ] Section B.4 — DROP TABLE — **explicit ack** + dispatched
