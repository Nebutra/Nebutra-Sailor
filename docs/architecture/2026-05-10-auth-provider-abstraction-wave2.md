# ADR: Auth Provider Abstraction — Wave 2

- **Date**: 2026-05-10
- **Status**: **Accepted** (revised after gap analysis 2026-05-10)
- **Owner**: tseka_luk
- **Supersedes**: nothing — first formal ADR for `@nebutra/auth`
- **Guiding principle**: [Hard-but-right for UX/DX](~/.claude/projects/-Users-tseka-luk-Documents-Nebutra-SaaS-Lab-Nebutra-Sailor/memory/feedback_hard_but_right_ux_dx.md) — speed is not a tiebreaker; for user/dev-facing surfaces, correctness wins
- **Related**: `packages/auth/AGENTS.md`, `packages/identity/AGENTS.md`

---

## Context

`@nebutra/auth` already ships a provider-agnostic abstraction with three concrete providers (Better Auth, Clerk, NextAuth) and 27 consumer files across `apps/web`, `apps/landing-page`, `apps/api-gateway`, plus a surprise consumer at `packages/saga/src/workflows/orderSaga.ts`. The abstraction is **functional but incomplete**:

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

### D6 — Migration sequencing: 5 PRs, additive only, TDD-driven, feature-flagged

| PR | Scope | Risk | Reversible |
|---|---|---|---|
| **PR 1** | Schema additive: create `auth` Postgres schema; add `BAOrganization / BAMember / BAInvitation / BAPasskey` models in `auth.*`; add `activeOrganizationId` column to `public.auth_sessions` (additive). **No** existing-table relocation. | Low | Yes (`DROP SCHEMA auth CASCADE` + drop column) |
| **PR 1.5** | User-table reconciliation plan: create `app.user_profile` table FK to `public.auth_users.id`; add nullable `external_id` columns to existing `User` / `Organization` for backfill linkage. **No data movement yet**, just structural prep. | Low | Yes (drop new tables/columns) |
| **PR 2** | `@nebutra/auth` API: add `signIn` / `signOut` to `AuthProvider`; add `AuthCapabilities` type + runtime probe; add optional `organizations` / `passkeys` / `twoFactor` / `magicLink` capability shapes; wire Better Auth plugins to expose methods through canonical interface; NextAuth + Clerk providers report `capabilities.* = false` for what they don't do. | Medium | Yes (revert package version) |
| **PR 3** | `apps/web` opts in to passkeys + orgs in **dev environment only** (env-gated). Tenant bridge: middleware reads `session.activeOrganizationId` → calls `runWithTenant(...)`. Update `@nebutra/identity` AGENTS.md boundary doc. | Medium | Yes (env flag) |
| **PR 4** | `apps/landing-page` + production rollout via feature flag (gradual %); rewire `@nebutra/oauth-server` to consume `@nebutra/identity`; absorb the 5 Clerk-direct-import files into the canonical interface where possible (some may legitimately stay Clerk-native). | Medium | Yes (flag off) |

**Hard rules (D6 invariants)**:
- Every PR ships tests-first (see "TDD Closed Loop" section below)
- No PR drops or renames existing columns/tables
- Every PR has a kill-switch (env var or feature flag)
- Schema migrations forward-only — rollback = forward-fix
- A PR is not merge-ready until: tests green + manual smoke test on dev + capability probe report attached to PR description
- Every provider implementation has a contract test — adding a new provider in the future means writing the same test against it

---

### D7 — Capabilities probe is runtime, not static

The probe inspects the actual `auth.api` surface after `initAuth()` completes, not config intent. Reasoning: Better Auth plugin loading is dynamic (`packages/auth/src/providers/better-auth.ts:106-114`) and can fail silently. The probe must reflect reality, not promises.

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

**1. Schema migration tests** (`packages/db/__tests__/migrations/`)
- For each migration: spin up an empty Postgres in CI (Testcontainers or pglite), run migration up, assert table/column existence + constraints, run migration down, assert rollback clean
- PR 1 ships with `2026-05-10-add-ba-orgs-passkeys.test.ts`

**2. Provider contract tests** (`packages/auth/__tests__/contracts/`)
- One test file per canonical method: `getSession.contract.test.ts`, `signIn.contract.test.ts`, etc.
- Each test imports ALL three providers via `createAuth({ provider })` and runs the same assertions
- Capability-gated methods (orgs/passkeys/2FA/magicLink) have contract tests that:
  - Assert behavior when `capabilities.X === true`
  - Assert clean throw with specific error class when `capabilities.X === false`
- New provider added later → drops into the contract suite, must pass without test changes

**3. Capabilities probe tests** (`packages/auth/__tests__/capabilities.test.ts`)
- For each provider × each capability: assert probe matches reality (mount plugin → expect `true`; omit plugin → expect `false`)
- Catches plugin-loaded-but-not-exposed bugs (the silent failure mode flagged in gap analysis)

**4. Tenant-bridge integration tests** (`packages/auth/__tests__/tenant-bridge.test.ts`)
- Test: user signs in with Better Auth → orgs plugin sets `activeOrganizationId` on session → middleware calls `runWithTenant({ id: session.activeOrganizationId }, ...)` → `getCurrentTenant()` returns expected org → RLS-protected query returns only org-scoped rows
- Single test exercises the whole vertical slice (PR 3)

**5. E2E tests** (`apps/web/tests/e2e/auth/`)
- Playwright: full sign-in via passkey, full org-create + invite flow, full 2FA enroll
- Runs in CI on PR 3 + PR 4
- Required for production rollout in PR 4

**6. Coverage gates**
- `packages/auth`: ≥ 80% line, ≥ 75% branch
- `packages/db` (migration code): ≥ 90% (tight)
- `packages/tenant`: ≥ 80%
- Coverage report attached to PR description; CI fails if regression

### Tests-first workflow per PR

Every PR description must include a "Tests Added" section enumerating:
1. New contract / unit tests written **before** implementation
2. Coverage delta (must be ≥ 0)
3. Capabilities probe output (paste of `console.log(auth.capabilities)` for each provider)
4. Manual smoke checklist with checkboxes

If a PR can't articulate the tests-first ordering, it's blocked at review.

### Tooling

- Test runner: **vitest** (already standard per `pnpm-workspace.yaml`)
- Postgres in tests: **Testcontainers** (preferred, real Postgres) for schema/migration/RLS tests; **pglite** for fast unit tests
- E2E: **Playwright** (per project rules)
- Coverage: **@vitest/coverage-v8**
- CI: extend `.github/workflows/ci.yml` with a `auth-contract-tests` job that runs on every PR touching `packages/auth/**`, `packages/db/**`, `packages/tenant/**`

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
- **R2 — `packages/saga/orderSaga.ts` surprise consumer** (likelihood: low). Mitigation: gap-analysis follow-up audits its `@nebutra/auth` surface area before PR 2
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
- [ ] PR 1 dispatched
