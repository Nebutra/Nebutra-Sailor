# ADR: Auth Provider Abstraction — Wave 2

- **Date**: 2026-05-10
- **Status**: **Accepted** (revised after gap analysis 2026-05-10)
- **Owner**: tseka_luk
- **Supersedes**: nothing — first formal ADR for `@nebutra/auth`
- **Guiding principle**: [Hard-but-right for UX/DX](~/.claude/projects/-Users-tseka-luk-Documents-Nebutra-SaaS-Lab-Nebutra-Sailor/memory/feedback_hard_but_right_ux_dx.md) — speed is not a tiebreaker; for user/dev-facing surfaces, correctness wins
- **Related**: `packages/iam/auth/AGENTS.md`, `packages/iam/identity/AGENTS.md`

---

## Context

`@nebutra/auth` already ships a provider-agnostic abstraction with three concrete providers (Better Auth, Clerk, NextAuth) and 27 consumer files across `apps/web`, `apps/landing-page`, `backends/gateway`, plus a surprise consumer at `packages/integrations/saga/src/workflows/orderSaga.ts`. The abstraction is **functional but incomplete**:

- `AuthProvider` interface omits `signIn`/`signOut` despite being foundational
- Better Auth plugins (organizations, passkeys, twoFactor, magicLink) load dynamically but their methods are not exposed through the canonical interface
- `auth_*` tables exist in `public` schema but no Postgres-schema isolation
- Two parallel User/Organization table sets (Clerk-shaped `User.clerkId` AND `AuthUser`) with no defined migration path
- Boundary with `@nebutra/identity` (zero current consumers — orphan package) is unclear
- 5 consumer files in `apps/web` directly import `@clerk/nextjs`, bypassing the abstraction

**Trigger**: competitive analysis vs supastarter highlighted that Better Auth's passkeys/orgs/magic-link surface is a real product gap. Per the project principle, this gets the hard-but-right treatment, not a quick patch.

---

## Decisions

### D1 — Abstraction depth: Smart middle layer with capabilities probe

Core `AuthProvider` interface is thin. Advanced features expose through a runtime capabilities probe + provider-specific extension methods.

```ts
interface AuthProvider {
  // ── Core (every provider implements; throws if not applicable) ──
  getSession(req): Promise<Session | null>;
  getUser(id): Promise<User | null>;
  signIn(method: SignInMethod): Promise<SignInResult>;       // ← MUST add (currently missing)
  signOut(req): Promise<void>;                               // ← MUST add (currently missing)
  middleware(): MiddlewareHandler;
  handleWebhook(req): Promise<Response>;

  // ── Optional capability surfaces (presence gated by capabilities probe) ──
  organizations?: OrganizationCapability;   // create/list/setActive/invite/members
  passkeys?: PasskeyCapability;             // register/authenticate/list/revoke
  twoFactor?: TwoFactorCapability;          // enroll/verify/backupCodes
  magicLink?: MagicLinkCapability;          // send/verify

  // ── Probe (runtime, reflects actual mounted plugins, not config intent) ──
  capabilities: Readonly<AuthCapabilities>;
}

interface AuthCapabilities {
  passkeys: boolean;
  organizations: boolean;
  twoFactor: boolean;
  magicLink: boolean;
  impersonation: boolean;
}
```

**Rationale**: forces honest API surface. App code uses `if (auth.capabilities.passkeys)` to gate UI; type-narrows via discriminated optional methods. No fake stubs; no provider lies about features.

**Hard-but-right note**: easier path is to throw "not implemented" from every method on every provider. We pay the abstraction cost upfront so app code stays clean for years.

---

### D2 — Provider tier model: First-class / Maintain / Bridge

Revised after discovery that NextAuth provider already exists in code:

| Provider | Tier | Surface | Investment |
|---|---|---|---|
| **Better Auth** | **First-class** (default reference) | All capabilities (orgs, passkeys, 2FA, magicLink, admin escape-hatch) | Active — gets all new capability work |
| **Clerk** | **Maintain** | Bridge to Clerk SDK; consumers using Clerk-native features stay; we don't expose Clerk-specific methods through the canonical interface | Maintenance only — keep working, no new feature catch-up |
| **NextAuth** | **Maintain (core only)** | `getSession` / `getUser` / `signIn` / `signOut` / `middleware`. **No** orgs / passkeys / 2FA / magicLink — capabilities probe reports `false` for all four | Maintenance only — honest about scope, no speculative org/passkey impl |

**Rationale on NextAuth specifically** (user explicitly chose to keep it): NextAuth lacks native orgs/passkeys/2FA. Building them on top would re-implement Better Auth's value prop in parallel — DX-negative. The honest position is: NextAuth covers the basics for customers who explicitly need it; for full feature parity, they pick Better Auth. **Capabilities probe makes this transparent at runtime.**

**Hard-but-right note**: easy path is "build it all on top of NextAuth so we look complete." Right path is "be honest about what each provider gives you."

---

### D3 — Database strategy: Dual schema, additive only (Shape B)

Same Postgres database, two schemas. **Existing tables stay where they are**:

```
public.auth_users           ← already exists, stays put (Better Auth core)
public.auth_sessions        ← already exists, stays put
public.auth_accounts        ← already exists, stays put
public.auth_verifications   ← already exists, stays put

auth.organization           ← NEW (Better Auth orgs plugin)
auth.member                 ← NEW
auth.invitation             ← NEW
auth.passkey                ← NEW (Better Auth passkeys plugin)
                              (Better Auth 2FA columns already on auth_users from 2026-05-09 migration)

app.user_profile            ← NEW in PR 1.5 — business extension keyed on auth_users.id
app.tenant_meta             ← NEW in PR 1.5 — business extension keyed on auth.organization.id
public.<existing business>  ← untouched
```

**Why Shape B over textbook "all auth.* together"**:
- Existing `auth_*` tables already have data and the 2FA migration just landed; relocating them would break D6's additive-only rule and risks adapter resolution issues
- New BA-plugin tables (organization/member/invitation/passkey) are greenfield — they go straight to `auth.*`
- Reversibility preserved: `DROP SCHEMA auth CASCADE` is fully reversible

**Hard-but-right note**: easy path is "leave everything in `public` and call it done." Right path is partial isolation now (new tables) + a clear future move for the legacy `auth_*` tables when we can afford one-time downtime.

---

### D4 — Boundary: `@nebutra/auth` vs `@nebutra/identity`

| Package | Owns | Triggered by |
|---|---|---|
| `@nebutra/auth` | Runtime user authentication state in Sailor's own apps | User logs in to web/landing-page; API gateway verifies session cookie |
| `@nebutra/identity` | Translating any external identity claims into `CanonicalIdentity` | `@nebutra/oauth-server` issues JWT to a 3P app, that 3P app uses identity to parse it; S2S tokens; external OIDC userinfo |

**Action**: `@nebutra/identity` currently has **zero consumers** in the repo. The hard-but-right call:
- **Do NOT delete** — the conceptual boundary is real and we'll need it for `oauth-server` + S2S work
- **Do force `@nebutra/oauth-server` to consume `@nebutra/identity`** in PR 4 — gives it a real consumer, validates the boundary, prevents zombie-package status
- Until PR 4: leave it untouched but add a clear AGENTS.md "Status: pending consumer wiring in Wave 2 PR 4" note

**Hard-but-right note**: easy path is "delete the orphan package." Right path is "keep the conceptual seam, give it a real job."

---

### D5 — Capabilities surface (final list)

First-class on `AuthProvider` interface (gated by `capabilities`):
- `organizations` — `create / list / setActive / invite / acceptInvite / members / removeMember / updateMemberRole`
- `passkeys` — `register / authenticate / list / revoke`
- `twoFactor` — `enroll(totp) / verify / generateBackupCodes / disable`
- `magicLink` — `send / verify`

Escape-hatch (provider-specific, accessed via type narrowing):
- Clerk's React UI components (`<UserButton>`, `<OrganizationSwitcher>`)
- Better Auth admin plugin (impersonation, user management)
- Anything else provider-unique

---

### D6 — Migration sequencing: 3 phases, direct-to-main commits, additive only, TDD-driven

Per project workflow ([feedback_main_only_workflow.md](~/.claude/projects/-Users-tseka-luk-Documents-Nebutra-SaaS-Lab-Nebutra-Sailor/memory/feedback_main_only_workflow.md)) — no feature branches / no PR ceremony for this monorepo. Work ships as **direct commits to `main`**, grouped into 3 logical **phases** for narrative clarity. Within each phase, multiple smaller commits are still expected (each one must independently pass tests and be reversible).

| Phase | Scope | Commits (target) | Risk | Reversible |
|---|---|---|---|---|
| **Phase 1 — Foundation** (schema + API surface) | (a) `auth` Postgres schema + 4 new BA-plugin tables (`organization`/`member`/`invitation`/`passkey`) + `active_organization_id` column on `public.auth_sessions`; (b) `app.user_profile` table FK to `auth_users.id` + nullable `external_id` columns on existing `User`/`Organization`; (c) `AuthProvider` interface gains `signIn`/`signOut` + `capabilities` runtime probe + optional `organizations`/`passkeys`/`twoFactor`/`magicLink` capability shapes; (d) Better Auth provider wires up plugin methods through canonical interface; Clerk + NextAuth providers report `capabilities.* = false` for unsupported features | 4-6 commits | Low–Medium | Yes (drop schema + drop columns + revert package) |
| **Phase 2 — Dev opt-in** (apps/web in dev only) | Tenant bridge middleware (`session.activeOrganizationId` → `runWithTenant(...)`); passkeys/orgs UI in `apps/web` gated by `NEXT_PUBLIC_AUTH_FEATURES` env flag; E2E tests for new flows; update `packages/iam/auth/AGENTS.md` + `packages/iam/identity/AGENTS.md` boundary docs | 3-5 commits | Medium | Yes (env flag off) |
| **Phase 3 — Prod rollout + cleanup** | Production feature flag (`@nebutra/feature-flags`) for gradual % rollout; rewire `@nebutra/oauth-server` to consume `@nebutra/identity`; absorb the 5 Clerk-direct-import files in `apps/web` into the canonical interface where possible | 3-5 commits | Medium | Yes (flag off + revert) |

**Hard rules (D6 invariants — apply per-commit, not per-phase)**:
- Every commit ships tests-first (see "TDD Closed Loop" section below)
- Every commit individually passes `pnpm typecheck` + `pnpm test` + `pnpm lint`
- No commit drops or renames existing columns/tables
- Every commit is independently reversible (`git revert <sha>` should not break `main`)
- Every behavior-changing commit ships behind a kill-switch (env var or feature flag) that defaults to off until the phase explicitly turns it on
- Schema migrations are forward-only — rollback = forward-fix, never down-migration on prod
- A commit message includes: capability probe output (`pnpm --filter @nebutra/auth test:probe` paste), coverage delta, kill-switch name
- Every provider implementation has a contract test — adding a new provider later means writing the same test against it
- **No batching**: don't bundle 5 unrelated changes into one mega-commit just because we're not opening PRs. Each commit is one coherent step
- **Phase boundaries are narrative, not gates**: nothing prevents Phase 2 work from starting before Phase 1's last commit lands, as long as commit-level invariants hold

---

### D7 — Capabilities probe is runtime, not static

The probe inspects the actual `auth.api` surface after `initAuth()` completes, not config intent. Reasoning: Better Auth plugin loading is dynamic (`packages/iam/auth/src/providers/better-auth.ts:106-114`) and can fail silently. The probe must reflect reality, not promises.

```ts
// providers/better-auth.ts (PR 2 sketch)
export async function createBetterAuthProvider(config): Promise<AuthProvider> {
  const auth = await initBetterAuth(config);
  const capabilities: AuthCapabilities = {
    organizations: typeof auth.api.createOrganization === "function",
    passkeys: typeof auth.api.generatePasskeyRegistrationOptions === "function",
    twoFactor: typeof auth.api.enableTwoFactor === "function",
    magicLink: typeof auth.api.sendMagicLink === "function",
    impersonation: typeof auth.api.impersonateUser === "function",
  };
  return { /* methods */, capabilities };
}
```

A capability test runs in CI for every provider on every PR — drift is caught immediately.

---

## TDD Closed Loop (binding for every PR in this Wave)

This section makes the project's TDD principle concrete for the auth refactor. Each PR follows the loop; no PR merges without it.

### Loop definition

```
        ┌─────────────────────────────────┐
        │  1. Write failing test (RED)    │
        │     - Contract test if new      │
        │       AuthProvider method       │
        │     - Schema migration test if  │
        │       schema change             │
        │     - Integration test if env   │
        │       wiring                    │
        └────────────┬────────────────────┘
                     ▼
        ┌─────────────────────────────────┐
        │  2. Run — verify it FAILS for   │
        │     the right reason            │
        └────────────┬────────────────────┘
                     ▼
        ┌─────────────────────────────────┐
        │  3. Implement minimum to pass   │
        │     (GREEN)                     │
        └────────────┬────────────────────┘
                     ▼
        ┌─────────────────────────────────┐
        │  4. Refactor (IMPROVE)          │
        │     - Extract, rename, simplify │
        │     - Re-run; tests still green │
        └────────────┬────────────────────┘
                     ▼
        ┌─────────────────────────────────┐
        │  5. Coverage gate ≥ 80% on      │
        │     touched packages            │
        └────────────┬────────────────────┘
                     ▼
        ┌─────────────────────────────────┐
        │  6. Provider contract suite     │
        │     runs against ALL providers  │
        │     (BA, Clerk, NextAuth) — no  │
        │     drift                       │
        └────────────┬────────────────────┘
                     ▼
        ┌─────────────────────────────────┐
        │  7. Manual smoke on dev env     │
        │     + capabilities probe report │
        │     attached to PR description  │
        └─────────────────────────────────┘
```

### Test layers required for Wave 2

**1. Schema migration tests** (`packages/platform/db/__tests__/migrations/`)
- For each migration: spin up an empty Postgres in CI (Testcontainers or pglite), run migration up, assert table/column existence + constraints, run migration down, assert rollback clean
- PR 1 ships with `2026-05-10-add-ba-orgs-passkeys.test.ts`

**2. Provider contract tests** (`packages/iam/auth/__tests__/contracts/`)
- One test file per canonical method: `getSession.contract.test.ts`, `signIn.contract.test.ts`, etc.
- Each test imports ALL three providers via `createAuth({ provider })` and runs the same assertions
- Capability-gated methods (orgs/passkeys/2FA/magicLink) have contract tests that:
  - Assert behavior when `capabilities.X === true`
  - Assert clean throw with specific error class when `capabilities.X === false`
- New provider added later → drops into the contract suite, must pass without test changes

**3. Capabilities probe tests** (`packages/iam/auth/__tests__/capabilities.test.ts`)
- For each provider × each capability: assert probe matches reality (mount plugin → expect `true`; omit plugin → expect `false`)
- Catches plugin-loaded-but-not-exposed bugs (the silent failure mode flagged in gap analysis)

**4. Tenant-bridge integration tests** (`packages/iam/auth/__tests__/tenant-bridge.test.ts`)
- Test: user signs in with Better Auth → orgs plugin sets `activeOrganizationId` on session → middleware calls `runWithTenant({ id: session.activeOrganizationId }, ...)` → `getCurrentTenant()` returns expected org → RLS-protected query returns only org-scoped rows
- Single test exercises the whole vertical slice (PR 3)

**5. E2E tests** (`apps/web/tests/e2e/auth/`)
- Playwright: full sign-in via passkey, full org-create + invite flow, full 2FA enroll
- Runs in CI on PR 3 + PR 4
- Required for production rollout in PR 4

**6. Coverage gates**
- `packages/iam/auth`: ≥ 80% line, ≥ 75% branch
- `packages/platform/db` (migration code): ≥ 90% (tight)
- `packages/iam/tenant`: ≥ 80%
- Coverage report attached to PR description; CI fails if regression

### Tests-first workflow per commit (direct-to-main)

Every behavior-changing commit message must include a "Tests" trailer block:

```
Tests:
- Added: <test file>::<test name> (RED → GREEN at this commit)
- Coverage: packages/iam/auth +X.X% (now Y.Y%)
- Probe: { passkeys: T/F, organizations: T/F, twoFactor: T/F, magicLink: T/F } per provider
- Kill-switch: AUTH_FEATURE_X (default: off)
- Smoke: <one-line manual verification done>
```

If a commit can't articulate the tests-first ordering, it's reverted. Same standard as PR review, just enforced at commit time instead of merge time.

### Tooling

- Test runner: **vitest** (already standard per `pnpm-workspace.yaml`)
- Postgres in tests: **Testcontainers** (preferred, real Postgres) for schema/migration/RLS tests; **pglite** for fast unit tests
- E2E: **Playwright** (per project rules)
- Coverage: **@vitest/coverage-v8**
- CI: extend `.github/workflows/ci.yml` with a `auth-contract-tests` job that runs on every PR touching `packages/iam/auth/**`, `packages/platform/db/**`, `packages/iam/tenant/**`

---

## Consequences

### Positive
- App code uses `auth.passkeys.register()` / `auth.organizations.setActive()` cleanly across providers
- Capabilities probe makes "swap providers" honest at runtime, not just type-level
- Dual-schema (Shape B) gives logical isolation without breaking existing data
- Contract test suite catches provider drift on every commit
- TDD loop makes regressions surface in CI, not in production

### Negative / Costs
- 5-PR migration takes ~3-4 weeks (per PR: 1-3 days + review)
- TDD discipline adds ~30% time to each PR vs "implement then test"
- Testcontainers in CI adds 30-60s per test job (one-time cost)
- Contract tests require maintaining test fixtures for all 3 providers (acceptable — protects against the silent regressions we already saw in gap analysis)
- `@nebutra/identity` rewiring (PR 4) touches `oauth-server` — adds scope to PR 4

### Risks
- **R1 — Better Auth/Prisma 7 generated-client caveat** (likelihood: low; gap analysis found this is workable). Mitigation: PR 1 typecheck verifies `@nebutra/db` re-exports the generated client correctly
- **R2 — `packages/integrations/saga/orderSaga.ts` surprise consumer** (likelihood: low). Mitigation: gap-analysis follow-up audits its `@nebutra/auth` surface area before PR 2
- **R3 — User-table cutover (PR 1.5 → eventual data migration) is not yet designed** (likelihood: medium — this is real future work). Mitigation: PR 1.5 only ships structural FKs + nullable columns; data movement is a separate ADR after Wave 2 ships
- **R4 — Testcontainers slow down CI** (likelihood: certain; ~30-60s/job). Mitigation: cache Postgres image; run BA-touching tests on a separate parallel job

---

## Alternatives Considered & Rejected

1. **Pure thin abstraction, no capabilities probe** — rejected: passkeys/orgs are real product needs; pretending they don't exist is a UX/DX shortcut
2. **Make Clerk the default** — rejected: SaaS-only model contradicts self-host customer profile; great wall blocks China
3. **Drop multi-provider, lock to Better Auth only** — rejected: Clerk + NextAuth already integrated and serve real customer profiles; cost to keep is small
4. **Build NextAuth orgs/passkeys to feature parity** — rejected: re-implements Better Auth's value prop; DX-negative; zero customer demand for it
5. **Big-bang migration in one PR** — rejected: 27 consumers + irreversible schema = unacceptable blast radius
6. **Implementation-first, tests-after** — rejected: violates project TDD principle; Wave 2 is exactly the kind of multi-provider work where contract tests prevent silent drift
7. **Schema Shape A (relocate `auth_*` to `auth.*`)** — rejected: breaks D6 additive-only; risks adapter resolution issues
8. **Delete `@nebutra/identity`** — rejected: orphan package now, but conceptual boundary is real; force a real consumer in PR 4 instead

---

## Open Questions Resolved (from Draft)

- ~~O1~~: 🟢 Better Auth 1.5.6 + Prisma 7.4 = compatible; verify `@nebutra/db` exports the generated client
- ~~O2~~: 🟡 Better Auth orgs plugin maps cleanly to Sailor tenant via bridge middleware (PR 3 scope)
- ~~O3~~: Existing `auth_*` tables appear empty (greenfield assumption); confirm with `SELECT COUNT(*)` against staging before PR 1
- ~~O4~~: 🟢 No naming collision between `oauth-server` (uses `oauth_*` prefix) and Better Auth (uses `auth_*` + new `auth.*`)
- ~~O5~~: 🟡 5 Clerk-direct-import files in `apps/web` — server-side only, no UI components; PR 4 absorbs them where possible

---

## Sign-off

- [x] tseka_luk reviewed & accepted (revised version 2026-05-10 post gap analysis)
- [x] Open questions O1–O5 resolved by gap analysis
- [x] D6 revised to direct-to-main 3-phase model per project workflow preference
- [x] Phase 1.1 schema additive landed (see Audit Log below)
- [x] Phase 1.2 API surface landed — `e00476ee` + concurrent fix `6fb3cbcb`
- [x] Phase 1.3 capability shapes landed — `823b92df`
- [x] **Phase 1 COMPLETE** — 90 tests passing in `@nebutra/auth` (was 43 pre-Wave 2; +47 net new contract tests)
- [x] Phase 2.1 tenant `fromAuthSession` resolver — `9230c87a`
- [x] Phase 2.2 dual-source feature flag — `cc3cda44` + fixes `40288bee` / `6acc7c92`
- [x] Phase 2.3 `setActive` returns `{ headers }` — `419d29f2`
- [x] Phase 2.4 security UI flag gating — `494210fd`
- [x] Phase 2.5 org switcher + members + first `setActive` consumer — `9911e6b5`
- [x] Phase 2.6 OrgSwitcher mount + stale test cleanup — `2490d8c5`
- [x] **Phase 2 COMPLETE** — 698 tests passing in `@nebutra/web` (+55 net new since Phase 2 start)
- [x] Phase 3.1 feature-flags AUTH_* registered — `587b5cb4`
- [x] Phase 3.2 D4 contract test (oauth-server ⇄ identity, first real consumer of @nebutra/identity) — `f8b0d76c`
- [x] Phase 3.3 Clerk direct-import audit + provider env centralization — `b27f8aa1` (11 call sites collapsed to `getConfiguredAuthProvider()`)
- [x] Phase 3.4 Invitation consolidation ADR-12 — `fc7fe60b` (separate ADR file)
- [x] **Phase 3 COMPLETE** — 117 tests in `@nebutra/auth` (+7 config), 698 in `@nebutra/web`, 7 in `@nebutra/oauth-server` (was 0, identity now has its first consumer)
- [ ] Phase 3.5 — production gradual rollout: configure real `@nebutra/feature-flags` evaluator (Redis or DB-backed) and flip `auth.organizations` to a small % cohort — pending operations decision
- [ ] ADR-12 invitation migration Phase 1+2 dispatched (additive schema + BA databaseHooks) — see `2026-05-12-invitation-table-consolidation.md`

---

## Audit Log

### Phase 1.1 — landed in commit `61f656a0` (with attribution issue)

**Date**: 2026-05-10
**Status**: Work product correct, commit attribution polluted

**What actually landed in `61f656a0`** (despite its title `fix(scripts): correct REPO_ROOT depth in 3 design package scripts after W3b`):
- 3 design script `REPO_ROOT` depth fixes (matches the title)
- `packages/iam/auth/package.json` adds missing `@nebutra/db` dep (mentioned in commit body)
- **Phase 1.1 of this ADR — undocumented in the commit message:**
  - `packages/platform/db/prisma/schema.prisma` — adds `auth` schema entry to `datasource.schemas`; adds `BAOrganization`/`BAMember`/`BAInvitation`/`BAPasskey` models with `@@schema("auth")`; adds `activeOrganizationId` field + index to existing `AuthSession`
  - `packages/platform/db/prisma/migrations/20260510000000_add_ba_orgs_passkeys/migration.sql` — strictly additive: 1× `CREATE SCHEMA auth`, 4× `CREATE TABLE`, 8× indexes, 1× `ADD COLUMN active_organization_id`, 4× FK with CASCADE
  - `packages/platform/db/__tests__/migrations/2026-05-10-add-ba-orgs-passkeys.test.ts` — 19 tests, RED→GREEN
  - `packages/platform/db/vitest.config.ts` — new
  - `packages/platform/db/package.json` — adds `@electric-sql/pglite` devDep
  - `packages/platform/db/src/generated/prisma/**` — regenerated client (new BA model files)
  - `pnpm-lock.yaml` — updated for pglite

**Verification at HEAD**:
- `pnpm --filter @nebutra/db test` → 19/19 pass
- `pnpm --filter @nebutra/db typecheck` → exit 0
- `pnpm --filter @nebutra/auth typecheck` → exit 0
- `pnpm exec prisma validate` → schema valid

**Why not rewritten**: `61f656a0` was already pushed to `origin/main` by the time the issue was discovered. Rewrite requires `git push --force` to main, which is prohibited by safety protocol. Documented here for archeology instead.

**Root cause**: a concurrent agent session was running W3b infrastructure fixes during the same window as the Phase 1.1 schema work. That session committed first and silently absorbed the schema work into its own commit. **This violates D6 invariant "no batching" and breaks per-commit TDD attribution.**

**Mitigation for Phase 1.2 / 1.3**: do not dispatch any further agent commits to `packages/platform/db/` or `packages/iam/auth/` while concurrent sessions are active on those paths. Coordinate or serialize.

### Technical findings to apply in Phase 1.2 / 1.3

1. **Prisma 7: `multiSchema` is no longer a preview feature.** `prisma validate` rejects `previewFeatures = ["multiSchema"]`. Use `datasource.schemas` + `@@schema(...)` directives directly. Final 1.1 schema does NOT include the preview flag.
2. **Prisma 7 CLI rename**: `--to-schema-datamodel` → `--to-schema`. When generating migration SQL without a live DB, the before/after schema-snapshot diff trick works without a shadow DB.
3. **pglite is the right test infra for schema structural tests** in this repo. Already used in 1.1; reuse for any Phase 2 / 3 migration tests. For tests requiring extensions (`vector`, `uuid_ossp`) or real RLS, fall back to Testcontainers.
4. **`public.OrganizationInvitation` (old Clerk-shaped) duplicates `auth.invitation` (new BA) in purpose** but with different shape (token, acceptedAt, etc.). They coexist intentionally per D3, but Phase 3 should produce a separate consolidation ADR before deleting the legacy table. Add this to the Phase 3 scope.
5. **Better Auth passkey table**: Prisma auto-mapped `credentialID` → `credential_i_d` column (literal underscore split). Better Auth's adapter expects this exact name; the 1.1 test asserts it explicitly so accidental rename is caught.
6. **`pnpm install` triggers postinstall side-effects** in design packages (writes to `packages/design/brand/scripts/sync-assets.ts` etc.). Phase 1.2 should run `pnpm install` once at start, then `git status` to confirm no uncommitted side-effects, then proceed.

### Phase 1.2 — landed in commit `e00476ee` + concurrent fix `6fb3cbcb`

**Date**: 2026-05-11
**Status**: Clean commit attribution

`AuthProvider` interface gains `signIn`, `signOut`, `capabilities`. All 3 providers implement; 16 contract tests RED→GREEN. 27 consumers continue to typecheck — additive changes only.

**Probe values verified at this commit:**
- `better-auth` (no plugins): all `false`
- `better-auth` (orgs+passkeys plugins mounted): `passkeys: true, organizations: true, twoFactor: false, magicLink: false, impersonation: false`
- `clerk`: `passkeys: true, organizations: true, twoFactor: true, magicLink: true, impersonation: false` (hardcoded per D2)
- `nextauth`: all `false` (hardcoded per D2)

**Follow-up commit `6fb3cbcb`** by a concurrent agent: relaxed optional capability shape types to allow `T | undefined` for `exactOptionalPropertyTypes`. Acceptable patch; no semantic change.

**Surprises that informed 1.3:**
- Clerk's `signIn` returns `{ ok: false, code: "client-side-only" }` for **all** methods (including email-password). Clerk SDK has no clean server-side login path without `@clerk/backend`. This deviates slightly from initial ADR ("implement email-password server-side") but is the honest position per D2 ("we don't expose Clerk-specific methods through the canonical interface").
- NextAuth v5 server-side `signIn({ redirect: false })` returns a plain result object; works as the bridge implementation.
- Better Auth probe is cached + refreshed on `signIn`; eager fire-and-forget probe runs in the provider constructor.

### Phase 1.3 — landed in commit `823b92df`

**Date**: 2026-05-11
**Status**: Clean commit attribution

4 optional capability shapes (`organizations`, `passkeys`, `twoFactor`, `magicLink`) added to `AuthProvider` interface. Better Auth's plugins are wired through. Clerk and NextAuth explicitly return `undefined` for all shapes per D2. 31 new tests; 90 total in `@nebutra/auth`.

**Canonical → BA 1.5.6 method-name mapping** (verified in `node_modules/better-auth/dist/plugins/<plugin>/index.d.ts`):

| Canonical | BA method |
|---|---|
| `organizations.create` | `createOrganization` |
| `organizations.list` | `listOrganizations` |
| `organizations.setActive` | `setActiveOrganization` (takes `headers` + `body`) |
| `organizations.invite` | `createInvitation` |
| `organizations.acceptInvite` | `acceptInvitation` |
| `organizations.members` | `listMembers` |
| `organizations.removeMember` | `removeMember` |
| `organizations.updateMemberRole` | `updateMemberRole` |
| `passkeys.register` | `generatePasskeyRegistrationOptions` |
| `passkeys.authenticate` | `verifyPasskey` (fallback `signInPasskey`) |
| `passkeys.list` / `revoke` | `listPasskeys` / `deletePasskey` |
| `twoFactor.enroll` | `enableTwoFactor` (returns `totpURI`+`secret`+`backupCodes`) |
| `twoFactor.verify` | `verifyTOTP` (fallback `verifyTwoFactor`) |
| `twoFactor.backupCodes` | `generateBackupCodes` (fallback `viewBackupCodes`) |
| `twoFactor.disable` | `disableTwoFactor` |
| `magicLink.send` | `signInMagicLink` (passes `redirectTo` as `callbackURL`) |
| `magicLink.verify` | `magicLinkVerify` |

**Concurrent collision repeated**: `packages/iam/auth/src/types.ts` was touched by another agent (commit `6fb3cbcb`) during Phase 1.3 work. The agent handled it by scoping its commit to providers + tests only, letting the concurrent commit own `types.ts`. **The collision-prone surface (TS type files in `iam/auth`) is now identified as a serialization hotspot — Phase 2 must enforce serialization or coordinate.**

**Surprises that inform Phase 2:**
- **BA 1.5.6 doesn't ship a `passkey` plugin in its exports map.** Capability probe will report `passkeys: false` at runtime even on BA-backed apps until a future BA version ships it. Builder uses fallback chains (`verifyPasskey ?? signInPasskey`) so it'll pick up automatically when BA adds it.
- **BA `setActiveOrganization` cookie propagation**: the canonical `organizations.setActive(req, organizationId)` forwards `req.headers` to BA, but BA's response writes `Set-Cookie` headers that need to reach the *outgoing* response. The tenant-bridge middleware in Phase 2 must capture BA's response, extract `Set-Cookie`, and merge into the Next.js / Hono response. Current canonical shape returns `void` so that adapter layer lives in middleware, not in `@nebutra/auth`.
- **`build*Capability` functions are exported** from `providers/better-auth.ts` for unit testing but NOT re-exported from `src/index.ts`. If Phase 2 wants them user-callable, re-export; otherwise mark `@internal`.

### Phase 1 closeout

| Phase | Commit(s) | Tests added | Result |
|---|---|---|---|
| 1.1 schema | `61f656a0` (polluted title) | 19 | ✅ work correct |
| 1.2 API surface | `e00476ee` + `6fb3cbcb` | 16 | ✅ clean |
| 1.3 capability shapes | `823b92df` | 31 | ✅ clean |
| **Total** | 4 commits | **+66 tests** (43 → 90 in `@nebutra/auth` + 19 in `@nebutra/db`) | ✅ Phase 1 done |

Net result: `AuthProvider` is now feature-complete for the ADR D5 surface; Better Auth is the only provider that fully implements the optional shapes (per D2 design); 27 consumers continue to typecheck unchanged. Ready for Phase 2 (tenant bridge + dev opt-in in `apps/web`).

### Phase 2 closeout

| Phase | Commit | Tests added | Result |
|---|---|---|---|
| 2.1 tenant `fromAuthSession` resolver | `9230c87a` | +7 | ✅ dependency-free callback design (no `@nebutra/auth` import in tenant) |
| 2.2 dual-source feature flag | `cc3cda44` + `40288bee` + `6acc7c92` | +17 | ✅ env first, `@nebutra/feature-flags` second, safe-false fallback |
| 2.3 `setActive` returns `{ headers }` | `419d29f2` | +3 net | ✅ BA's `returnHeaders: true` API used; explicit caller-forward |
| 2.4 security UI flag gating | `494210fd` | +5 | ✅ legacy defaults preserved for non-opted-in callers |
| 2.5 switcher + members + setActive consumer | `9911e6b5` | +23 | ✅ NextResponse cookie-merge ordering bug caught + fixed |
| 2.6 OrgSwitcher mount + stale test cleanup | `2490d8c5` | -2 stale | ✅ header mount only; sidebar `<select>` stays as flag-off fallback |
| **Total** | 6 commits + 2 follow-up fixes | **+53 net new tests** | ✅ Phase 2 done — 698 passing in `@nebutra/web`, 110 in `@nebutra/auth`, 25 in `@nebutra/tenant` |

**Patterns to reuse / lessons:**
- **Dependency-free bridge resolver** (Phase 2.1): when integrating two unidirectional packages, pass a getter callback instead of importing. Keeps lower-level packages neutral and avoids circular install.
- **Dual-source flag** (Phase 2.2): env wins, async fallback to feature-flag service, **always safe-default false on error**. Never throw from a flag check.
- **Explicit headers for low-consumer APIs** (Phase 2.3): when only 1-2 consumers need response-side data, returning structured result beats hiding magic in middleware. Stripe/Linear/Vercel SDK pattern.
- **NextResponse cookie merge ordering trap** (Phase 2.5): `response.cookies.set(...)` rewrites the `set-cookie` header from its internal cookie list and clobbers any prior `headers.append("set-cookie", ...)`. Pattern: write first-party cookies via NextResponse API FIRST, then `append` external (BA) Set-Cookie SECOND.
- **Feature-flag gate + product-capability gate are different concepts** (Phase 2.6): `supportsWorkspaceSwitching` = "this product allows orgs at all"; `isAuthFeatureEnabledSync("organizations")` = "the new BA-backed UX is shipped". Both must be true for new UI to mount. Legacy native `<select>` covers the (true && false) case.
- **Concurrent agent staging contamination** (Phases 1.1, 1.3, 2.2): explicit `git add <path>` only, never `-A`/`.`/`-a`. Verify `git status --short` before commit. If a sibling commit absorbs your staged files, `git reset --soft HEAD~1` and re-attribute.

### Phase 3 closeout

| Phase | Commit | Tests added | Result |
|---|---|---|---|
| 3.1 feature-flags AUTH_* | `587b5cb4` | 0 (typed registry) | ✅ flags registered in `FLAGS` constant; consumed by `features.ts` via `isFeatureEnabled` |
| 3.2 oauth-server ⇄ identity D4 contract | `f8b0d76c` | +7 | ✅ `@nebutra/identity` no longer an orphan — first real consumer (oauth-server) validates the boundary at CI time |
| 3.3 Clerk direct-import audit + provider centralization | `b27f8aa1` | +7 (config) | ✅ 11 duplicated env reads → single `getConfiguredAuthProvider()` helper. Clerk-direct imports confirmed D2-compliant (already gated by `if (provider === "clerk")`). Helper exported on both root + `/client` subpaths. |
| 3.4 Invitation consolidation ADR-12 | `fc7fe60b` | — (docs only) | ✅ separate ADR: `auth.invitation` canonical, 5-phase migration plan; awaiting sign-off |
| **Total** | 4 commits | **+14 net new tests** | ✅ Phase 3 functional cleanup complete |

**Discoveries during Phase 3:**

1. **The "5 Clerk direct imports" from the original gap analysis was misleading.** By 2026-05-12, all 11 production-code Clerk imports across `apps/web/**` were already correctly gated by `if (provider === "clerk")` branches per ADR D2's "Maintain" tier. There was nothing to **absorb** — Clerk is the explicit fallback path. What needed cleanup was the **provider-detection duplication** (11 hand-rolled `process.env.AUTH_PROVIDER || ...` chains), which Phase 3.3 collapsed.
2. **`@nebutra/feature-flags` already exposes a real `dbProvider`** (Redis-cached, env-fallback) — not a stub as the original ADR suggested. The Phase 2.2 `features.ts` was already calling the correct `isFeatureEnabled` entry point. Phase 3.1's contribution: register the `auth.*` flag names in the canonical `FLAGS` constant so the prod path is honest about which flags exist.
3. **D4 contract test exposes a real gap**: `NEBUTRA_CLAIMS["organization:read"]` emits `nebutra:organization_name` + `nebutra:organization_slug`, but `NebutraIdentityAdapter.mapToCanonical()` drops them. Two acceptable resolutions: (a) widen `CanonicalIdentity` to carry org name/slug; (b) trim oauth-server's emitted claims. Test pins the gap so the next mover wakes up. Decision deferred — neither side has a customer yet.
4. **`@nebutra/auth` config helper needs both root + `/client` subpath exports**: client components like `security-settings-client.tsx` must import from `/client` to avoid pulling `createAuth`'s server-only transitives (Clerk's server SDK + `server-only` marker). Phase 3.3 added the helper to both subpaths from day one.

### Phase 3.5 — production rollout (not yet dispatched)

The pieces are in place; flipping the switch is an operations call:

1. **Configure `@nebutra/feature-flags` dbProvider in prod** — needs Redis URL (already in env via `@nebutra/cache`) and a flag-management surface (DB row, admin UI, or just direct Redis writes for now).
2. **Pick a starter cohort for `auth.organizations`** — e.g. internal staff org `org_nebutra_team` only, soak 7 days, watch for `Set-Cookie` propagation issues and BA `setActiveOrganization` errors.
3. **Open the percentage gates** — `isEnabledForPercentage(flag, context)` already exists in feature-flags; flip from 0 → 10 → 50 → 100 over 2-3 weeks.
4. **Retire `NEXT_PUBLIC_AUTH_*` env flags** once prod-managed flags are stable (move from dual-source to single-source).

This is the only Phase 3 item that **needs explicit human authorization** because it changes the production user experience for the first time. Not auto-dispatchable.
