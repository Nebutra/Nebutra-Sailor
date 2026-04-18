# ADR: License + Sleptons + CLI Closed-Loop

> **Status**: **Accepted** (approved 2026-04-18 with Q1-Q5 resolved inline)
> **Date**: 2026-04-18
> **Decision type**: Architectural · long-term strategic
> **Authors**: Claude + human review
> **Supersedes**: n/a

---

## 1. Context

### 1.1 Product positioning (reminder)

Nebutra-Sailor is a **dual-identity system**:
- **Template**: `create-sailor` scaffolds AI SaaS unicorn projects
- **Product**: Nebutra itself is built on this template, running the OPC creator network via `apps/sleptons/`

Five non-negotiable positioning constraints:
1. **Code-public, no gate** — `create-sailor` must work without auth
2. **Free for OPC / Individual** — zero-friction license for the target user
3. **$799 Startup tier** — the commercial revenue driver
4. **Sleptons as both showcase and network** — must convert scaffold users into community participants
5. **Long-term, self-sustaining** — not paid marketing; growth via product-led, template-led, community-led loops

### 1.2 Current state (factual audit)

**Sleptons MVP — `apps/sleptons/` (renamed from `apps/community/` 2026-04-18)**
- **Done**: `WelcomeOverlay`, `MemberCard`, `TierBadge`, `members API`, unit tests
- **Missing**: Showcase page, Ideas feed, Connections graph, Member profile page, engagement flywheel

**License management stack**
- `packages/license/` — `issueLicense` + `validateLicense` + `license.issued` event handler
- `apps/landing-page/api/license/` — web REST colon POST issue + GET validate
- `apps/landing-page/.../get-license/LicenseWizard.tsx` — 4-step web wizard (Clerk-gated)
- `packages/cli/commands/license.ts` — `sailor license activate <key>` + `sailor license status`
- DB: `License` + `CommunityProfile` models

**CLI flow** (current)
- `create-sailor` scaffolds **without** license
- `sailor license activate <key>` is a separate post-install command
- User manually copies key from web → terminal (no OAuth device flow)
- License once activated gates **nothing** functional; it's essentially a metadata pointer

### 1.3 Gap analysis

| Dimension | Today | Root cause |
|-----------|-------|------------|
| Data layer | ✅ closed-loop | DB + event + handler + repository all wired |
| Remote validation | ✅ closed-loop | CLI → `validate` endpoint works |
| **User journey** | ❌ broken | scaffold done card barely mentions license |
| **Activation UX** | ❌ high friction | copy-paste key, no OAuth device flow |
| **License gating** | ❌ no effect | activated ≠ unlocked anything |
| **Community onboarding** | ❌ broken | `license.issued` creates profile, doesn't invite to Sleptons |
| **Sleptons value** | ❌ thin | Welcome + Members only; no Showcase / Ideas / Connections |
| **Revenue conversion** | ❌ uninstrumented | no funnel tracking, no Startup upsell trigger |

---

## 2. Design principles (long-termist)

Before proposing a solution, lock these first-principles:

### P1: License is a **covenant**, not a gate

AGPL already forces compliance for network use. The license key is:
- A **community identity** (who you are in the OPC network)
- A **commitment marker** (you explicitly accepted the terms)
- An **entitlement lookup** (Startup/Enterprise unlock additional benefits: SLA, private preset registry, etc.)

It is **NOT** a DRM token. Never lock core features behind it.

**Long-term reason**: gated boilerplates die. next-forge / Supastarter gated and lost to free competitors. Our gate is community + services + ecosystem, not code.

### P2: **Earn trust progressively**

Corollary: user should get value *before* being asked to commit. Journey:
```
scaffold works   →   first dev run works   →   notices Sleptons value   →   claims license   →   joins community
```
Not:
```
asked to register   →   then gets template
```

### P3: **CLI and Web are two heads of one protocol**

The OAuth Device Flow (RFC 8628) is the **battle-tested pattern** from GitHub CLI / gh, Vercel CLI / vc, Claude Code CLI / auth, Supabase CLI / supabase login. Use it.

Reason: copy-paste key is hostile to:
- Mobile users who registered on phone but want CLI on laptop
- Windows terminal users (paste is broken in many terminals)
- CI environments (can automate OIDC → token later)

### P4: **Events, not coupling**

All state transitions (license.issued / sleptons.joined / startup.upgraded) flow through `@nebutra/event-bus`. Features subscribe. Never hard-code "on license do X, Y, Z in sequence".

Long-term: lets us add Discord role sync, email campaign trigger, Stripe billing sync, without touching the core issuance path.

### P5: **Sleptons is the product demonstrating the template**

Because Nebutra is a template **and** a community, every Sleptons feature must be:
- **Generic enough** that users could copy the pattern into their SaaS
- **Specific enough** to be a genuine community product for OPC founders
- **Always on the latest template version** (dogfood the dogfood)

If a Sleptons feature can't be generalized, it goes in `apps/sleptons/src/app/(nebutra-only)/` and gets stripped at template-sync.

### P6: **Measure the funnel, not the activity**

North-star metric: **scaffold → license → first commit → Sleptons showcase → Startup upgrade**.
Instrument every step. Decisions driven by leaky-bucket data, not guesses.

---

## 3. Alternatives considered

### Alt A — "Passive link" (no-change baseline)
- Current: post-install card mentions get-license URL
- Pro: zero work, zero coercion
- Con: **<5% will claim**, Sleptons stays empty, no funnel data

### Alt B — "OAuth Device Flow + Sleptons MVP" ⭐ **RECOMMENDED**
- CLI `sailor login` spawns RFC 8628 flow → auto-claim license + join Sleptons
- Sleptons Showcase/Ideas/Connections landed as genuine community features
- Event bus wires license ↔ Sleptons ↔ billing
- Pro: long-term sustainable, aligns with all 5 positioning constraints
- Con: 15-20h total implementation; needs to hold architectural bar

### Alt C — "Registration wall"
- `create-sailor` prompts for license key (or `--skip-license`)
- Pro: maximum funnel conversion (~60%)
- Con: **violates positioning P1**; open-source community will fork and remove the prompt; long-term kills trust

### Alt D — "Mandatory Clerk login in CLI"
- `sailor *` commands require Clerk session
- Pro: simplest centralized identity
- Con: impossible for offline / airgapped scaffolds; hostile to AGPL fork users; violates P2

---

## 4. Proposed architecture

### 4.1 System diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          USER'S MACHINE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  $ npm create sailor@latest                                                  │
│        │                                                                     │
│        │ (anonymous, always works)                                           │
│        ▼                                                                     │
│  ┌─────────────────────────────┐   post-install nudge    ┌────────────────┐ │
│  │  Scaffolded project          ├──────────────────────►│ Done card with  │ │
│  │  ~/.config/nebutra/           │                        │ "Join Sleptons" │ │
│  │    └ no license yet           │                        └────────┬────────┘ │
│  └─────────────────────────────┘                                  │         │
│                                                                    │         │
│  $ sailor login  (optional, opt-in)                               │         │
│        │                                                           │         │
│        │  (RFC 8628 device flow)                                  │         │
│        ▼                                                           │         │
│  ┌─────────────────────────────┐                                             │
│  │  Display one-time code +    │                                             │
│  │  verification URL in terminal│                                             │
│  │  Open browser automatically  │                                             │
│  └──────────────┬──────────────┘                                             │
│                 │                                                             │
└─────────────────┼─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                       nebutra.com (Landing-Page app)                            │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  /connect-cli?user_code=WDJB-MJHT                                               │
│        │                                                                        │
│        ▼                                                                        │
│  ┌──────────────────────┐     ┌────────────────────┐     ┌──────────────────┐ │
│  │ Clerk login (if not) ├────►│ LicenseWizard      ├────►│ Approve & Claim  │ │
│  │                       │     │ (2-step collapsed) │     │                  │ │
│  └──────────────────────┘     └────────────────────┘     └─────────┬────────┘ │
│                                                                     │          │
│                                                                     ▼          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  API /cli/device-auth/approve                                            │ │
│  │    ├─ issueLicense()  ───────► License + CommunityProfile               │ │
│  │    ├─ publishEvent("license.issued")                                     │ │
│  │    └─ write access_token for polling CLI                                 │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│                         @nebutra/event-bus                                      │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  license.issued  ───┬─► handler: create CommunityProfile (if missing)          │
│                     │                                                          │
│                     ├─► handler: create Sleptons showcase stub                 │
│                     │                                                          │
│                     ├─► handler: send welcome email (Resend / 阿里云邮件)       │
│                     │                                                          │
│                     ├─► handler: analytics — scaffold → license funnel step    │
│                     │                                                          │
│                     └─► (future) Discord role sync, Stripe pre-customer, etc. │
│                                                                                 │
│  sleptons.showcase.published ──► handler: X / 朋友圈 auto-post template        │
│  startup.upgraded             ──► handler: unlock private preset registry       │
│                                                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Data model deltas

All lives in `packages/db/prisma/schema.prisma`. **No new Nebutra-only models**; the `@conditional` mechanism is untouched.

- **`CliDeviceAuth`** (new, always-on) — stores device_code / user_code / verification state, short TTL
- **`License`** (existing) — add column `last_seen_cli_version` and `claimed_via` enum (`web_wizard` | `cli_device_flow`)
- **`SleptonsShowcase`** (new conditional? → actually always-on because Sleptons is stripped anyway) → lives in `apps/sleptons/` only, stripped from Sailor-Template

Migration naming: `20260418200000_cli_device_auth`.

### 4.3 Component ownership

| Concern | Package | Rationale |
|---------|---------|-----------|
| Device code generation, polling, approval | `packages/auth` (new sub-module `device-flow/`) | Auth primitives live here |
| License issuance + validation | `packages/license` | Existing — unchanged |
| Event publication on issuance | `packages/event-bus` | Already the pattern |
| CLI `sailor login` | `packages/cli/commands/login.ts` | New command |
| Web `/connect-cli` page | `apps/landing-page/src/app/[lang]/(marketing)/connect-cli/` | Lives next to existing `get-license` |
| Sleptons Showcase page | `apps/sleptons/src/app/showcase/` | Nebutra-specific |
| Generic "Showcase" pattern for template users | `packages/ui/patterns/showcase/` (future) | Extractable to template |

### 4.4 Security model

- Device code: 8 chars, `crypto.randomBytes`, 15-min TTL, single-use
- User code (for display): 8 chars alphanumeric with dash (`WDJB-MJHT`), same TTL
- Polling interval: CLI polls every 5s, server rate-limits to 1 req/5s per device_code
- Access token: JWT signed with AUTH_SECRET, includes `license_key` + `user_id` + `tier`; stored locally in `~/.config/nebutra/auth.json` (0600 perms)
- Token rotation: on each CLI invocation, refresh if older than 24h (license validation endpoint returns new token)

Threat model:
- Stolen device_code before approval: attacker gets bound to victim's Clerk identity at approval time (attacker never wins)
- Stolen access_token: limited blast radius — license reads are idempotent, token cannot be used to upgrade tier or create resources on user's behalf (except viewing Showcase)

---

## 5. Phased implementation plan

### Phase 0 — Ground truth & instrumentation (**expanded to ~6h** based on §10 Q1 decision)
**Ship before anything else.** If we don't measure, we can't improve.

**Infrastructure (self-hosted stack, no paid SaaS)**:
- [ ] Add `packages/analytics` wrapper with PostHog CE client (server + browser) — default `@nebutra/analytics` used across apps
- [ ] Add `packages/analytics/umami-proxy.ts` — server-side proxy so Umami works in CN and evades adblock
- [ ] `infra/docker-compose.analytics.yml` — PostHog CE + Umami + Metabase + shared Postgres
- [ ] `apps/sleptons/src/app/layout.tsx` — inject PostHog + Umami tracking pixels
- [ ] `apps/landing-page/src/app/[lang]/(marketing)/layout.tsx` — same

**Event contracts** (defined in `packages/analytics/events.ts` with Zod schemas):
- [ ] `scaffold.completed` — emitted from `create-sailor` done hook (fire-and-forget HTTPS post)
- [ ] `license.wizard.{started,step_completed,submitted,failed}` — web LicenseWizard
- [ ] `license.cli.{activate_attempted,activated,failed}` — CLI license command
- [ ] `sleptons.{profile_viewed,showcase_posted,ideas_voted}` — Sleptons pages
- [ ] `docs.search_query` — Meilisearch query log → PostHog
- [ ] `checkout.{started,completed,abandoned}` — Stripe checkout flow

**Funnel dashboards** (one-shot SQL → Metabase cards):
- [ ] Scaffold→License funnel (Step 1: scaffold.completed → Step 2: license.wizard.started → Step 3: license.issued → Step 4: cli.activated → Step 5: sleptons.first_action)
- [ ] Cohort retention (users by scaffold-day, return % at D1/D7/D30)
- [ ] Channel attribution (utm_source → conversion rate by tier)
- [ ] Payment funnel (国内 WeChat vs Alipay vs 海外 Stripe vs Lemon drop-off)
- [ ] Docs pain-point map (top 20 search queries with 0 result rate)

**Verify end-to-end**:
- [ ] Run `npx create-sailor my-test` locally → see `scaffold.completed` in PostHog staging within 30s
- [ ] Complete wizard → see all 4 events chained
- [ ] CLI activate → see `license.cli.activated`

**Success criteria**: One complete funnel chain captured + Metabase exec dashboard viewable at `metabase.nebutra.internal` (or local docker).

### Phase 1 — Post-install journey (P0 — this week, ~3h)
**Goal**: Close the biggest gap — scaffold users discover Sleptons/license naturally.

- [ ] Redesign `packages/create-sailor/src/ui/done.ts` with prominent Sleptons callout (bold color, specific CTA)
- [ ] New CLI command `sailor community` (placeholder — opens `https://nebutra.com/community?ref=cli`)
- [ ] New CLI command `sailor license claim` — opens browser to `/get-license?ref=cli&project=<detected>`
- [ ] Web `get-license` page reads `?ref=cli` query → simplifies wizard to 2 steps (role + teamSize; rest opt-in)
- [ ] After issuance, web shows "Run `sailor license activate <key>` to link your CLI"
- [ ] **Success metric**: >25% of scaffold users visit `/get-license` within 24h (measurable after Phase 0)

### Phase 2 — OAuth Device Flow (P1 — next week, ~8h)
**Goal**: Eliminate copy-paste friction; match GitHub/Vercel CLI UX bar.

- [ ] `packages/db` migration: `CliDeviceAuth` model + `License.claimed_via` column
- [ ] `packages/auth/device-flow/` — issuer, verifier, token signer
- [ ] Backend endpoints:
  - `POST /api/cli/device-auth/start` — returns `{ device_code, user_code, verification_url, expires_in, interval }`
  - `POST /api/cli/device-auth/poll` — returns `{ status: "pending" | "approved" | "denied" }` and `access_token + license_key` when approved
  - `POST /api/cli/device-auth/approve` — called from web `/connect-cli` after Clerk auth + wizard completion
- [ ] `apps/landing-page/src/app/[lang]/(marketing)/connect-cli/page.tsx` — reads `?user_code=`, guides through Clerk login + 2-step wizard + approve
- [ ] `packages/cli/commands/login.ts` — new `sailor login` command implementing RFC 8628 client side
- [ ] Migrate `sailor license activate` → deprecated but still works (copy-paste fallback)
- [ ] E2E test: headless Playwright approves device code, CLI receives token
- [ ] **Success metric**: `sailor login` p95 latency < 20s, success rate > 95%

### Phase 3 — Event wiring (P1 — parallelizable with Phase 2, ~4h)
**Goal**: License issuance triggers a cascade of valuable actions.

- [ ] Rewrite `packages/license/src/handlers/on-license-issued.ts` to publish domain event
- [ ] New handlers (each small, independently deployable):
  - `sleptons-profile-handler.ts` — create CommunityProfile if missing (may already exist; idempotent)
  - `sleptons-showcase-stub-handler.ts` — create placeholder showcase entry for the user's project
  - `welcome-email-handler.ts` — send via Resend (global) / 阿里云邮件 (CN)
  - `analytics-handler.ts` — pipe to PostHog / 百度统计
  - `discord-role-handler.ts` — (stub, activate when Discord is set up)
- [ ] Add idempotency key: `license.issued:<licenseKey>` so re-publish is safe

### Phase 4 — Sleptons MVP completion (P2 — weeks 3-4, ~12h)
**Goal**: Make Sleptons worth joining.

- [ ] `apps/sleptons/src/app/showcase/page.tsx` — project showcase feed (featured + latest + tag filter)
- [ ] `apps/sleptons/src/app/ideas/page.tsx` — ideas upvote feed (with `SleptonsUpvote` model)
- [ ] `apps/sleptons/src/app/[slug]/page.tsx` — member profile with their projects + connections
- [ ] `apps/sleptons/src/app/connections/page.tsx` — following/followers graph
- [ ] Extract generic `Showcase` / `UpvoteFeed` patterns to `packages/ui/patterns/community/` (template users benefit)
- [ ] API endpoints in `apps/api-gateway/src/routes/sleptons/` (but guarded so they're template-free — actually route through `apps/sleptons` directly since it's stripped from template)
- [ ] **Success metric**: at least 100 Showcase entries in first 90 days

### Phase 5 — Commercial conversion funnel (P2, ~6h)
**Goal**: Convert Individual/OPC users to Startup tier when they hit natural triggers.

- [ ] Usage-based triggers (reading from `@nebutra/metering`):
  - 5+ team members in org → nudge "Consider Startup tier for SSO"
  - Monthly AI spend > $50 → nudge "Startup tier unlocks AI Gateway credits"
  - 3+ projects in Showcase → nudge "Startup tier unlocks featured slot"
- [ ] In-CLI upsell (never blocking): `sailor license status` shows "You'd benefit from Startup tier because..." with anon-acknowledged dismissal
- [ ] Stripe checkout deep link via `sailor license upgrade` → browser → checkout → webhook → license tier update
- [ ] **Success metric**: ≥3% OPC → Startup conversion in first 180 days

---

## 6. Decisions encoded in code (P6 principle)

Principles from §2 encoded as **technical invariants**, not wiki pages:

| Principle | Invariant | Enforcement |
|-----------|-----------|-------------|
| P1 License ≠ gate | `@nebutra/license` has NO `requireLicense()` export that throws | ESLint custom rule; CI grep `requireLicense\|licenseGate` fails build |
| P2 Earn trust | `create-sailor` MUST NOT prompt for credentials of any kind | CI grep in `packages/create-sailor/src` for `p.password\|p.text.*password` fails build |
| P3 Two heads of one protocol | `sailor login` and `/get-license` wizard share the same Clerk org + write same License row | Integration test: start on CLI, complete on web, CLI gets same licenseKey as if wizard-only |
| P4 Events, not coupling | `issueLicense()` never imports Sleptons, email, or analytics modules directly | Architecture test (vitest.arch.config.ts) verifies packages/license depends only on db + event-bus |
| P5 Sleptons dogfoods | `apps/sleptons` extracts every reusable pattern into `packages/ui/patterns/community/*` | Review gate at PR time; knip scan confirms patterns are used by sleptons |
| P6 Measure funnel | Every state transition emits `analytics.track()` with consistent event name prefix | ESLint rule: emitting from wrong prefix triggers warning; PostHog dashboard lives in repo as IaC |

---

## 7. Success metrics (90-day horizon)

| Metric | Current | Target |
|--------|:-------:|:------:|
| npm downloads of `create-sailor` | ~3k (as of 2026-04-14) | 25k |
| Scaffold → License rate | unknown (not instrumented) | 25% |
| Web Wizard 2-step completion | n/a | 70% |
| CLI `sailor login` completion | n/a | 85% |
| Sleptons Showcase entries | 0 | 100 |
| OPC → Startup conversion | 0% | 3% |
| Monthly active Sleptons users | 0 | 500 |

Dashboards live in `docs/analytics/funnel-v1.md` (to be authored with Phase 0).

---

## 8. Risks & mitigations

| Risk | Likelihood | Severity | Mitigation |
|------|:---------:|:--------:|-----------|
| **Over-engineering the device flow** for low-traffic CLI | Medium | Medium | Phase 1 (simple URL) proves demand first; Phase 2 only if Phase 1 shows ≥25% claim rate |
| **Sleptons becomes a ghost town** | High | High | Phase 4 gated on Phase 1-3 showing ≥500 license issuances; do NOT build Showcase if no demand |
| **License service downtime blocks CLI** | Low | Medium | CLI gracefully degrades: cached validation for 24h, works offline for 7d, then warns |
| **Users fork to remove Clerk dependency** | Medium | Low | This is FINE — AGPL allows it; means we need to be valuable enough they don't. Track forks as signal |
| **Commercial pressure to gate features** | Medium | High | This ADR's P1 is non-negotiable. Revenue comes from (a) Startup tier perks, (b) Enterprise contracts, (c) ecosystem (hosted services, paid presets) — NEVER from locking base template |
| **Premature optimization in Phase 4** | Medium | Medium | Sleptons features gated by usage data; build showcase when 100+ scaffolds have happened, not before |
| **Template drift between main repo and Sailor-Template mirror** | Low | High | Existing `scripts/template-build.ts + .templateignore` tested; add e2e test that syncs → scaffolds → runs dev server |

---

## 9. Non-goals (explicitly out of scope)

- **No NFT / web3 license tokens** — we had Wallet/Nft orphan models; they're deleted and staying deleted
- **No self-serve Enterprise** — Enterprise is sales-led forever; no auto-upgrade button
- **No multi-org license transfer in Phase 1-3** — one user, one license key; org-level is Phase 5+
- **No Chinese real-name verification** — AGPL + Commercial license is sufficient; avoid PIPL hot zones for now
- **No Discord integration in Phase 1-3** — stub handler only; activate after 500 members exist

---

## 10. Open questions — **ANSWERED 2026-04-18**

### Q1. Phase 0 analytics stack
**Decision: self-hosted open-source stack, dual global/CN coverage. No paid SaaS.**

Stack (in priority of implementation):
| Layer | Tool | Role | Why |
|-------|------|------|-----|
| Product-event funnel | **PostHog CE** (self-hosted) | scaffold → license → sleptons → startup funnel, cohorts, retention | Best-in-class funnel/cohort tooling; open source; we control the data |
| Web analytics (no-JS-block) | **Umami** (self-hosted, Node+PG) | pageviews, referrer, UTM, device/OS breakdown, per-path | Immune to ad-blockers; minimal PII; perfect for CN traffic where GA is blocked |
| BI + ad-hoc SQL | **Metabase** (self-hosted) | ARPU, MRR, churn, funnel drill-down, exec dashboard | Reads Postgres directly — no pipeline needed; business users can self-serve |
| Search analytics | **Meilisearch** (self-hosted, already in template) | docs search terms, "most-searched pain" → content roadmap | Reuses infra we already ship; query logs built-in |
| API rate/geo | **Redis** (`@nebutra/cache`) | IP→city, RPS limits, bot detection | Already in infra |

**Rejected alternatives**:
- Vercel AI SDK analytics — vendor lock, partial coverage
- Plausible CE — good but weaker funnel than PostHog
- 百度统计 — closed data, can't export for Metabase join
- GA4 — blocked in CN, EU PIPL risk

**What this buys us long-term**: all user-level analytics flowing into Postgres → Metabase → executive view, all CN-accessible. No vendor lock anywhere.

### Q2. CLI-Web SSO互通
**Decision: DEFER to post-cold-start.**

Rationale: pre-cold-start, cross-device session convenience is a nice-to-have. Shipping Phase 1 simple URL-based claim is enough to validate demand. Revisit after 500+ licenses issued; by then real user feedback will tell us whether SSO friction matters.

### Q3. Sleptons Showcase — public vs gated
**Decision: PUBLIC, SEO-first.**

Rationale: aligns with "领先的 SEO 基础设施与服务" priority. Showcase is organic discovery flywheel:
- Public project pages → indexed by Google/Baidu → inbound traffic
- Each project's stack displayed → "how X built with Sailor" blog-style SEO
- Only **posting** requires Clerk auth (spam gate); reading is free
- Structured data (JSON-LD SoftwareApplication + Person schema) on each page
- Sitemap + RSS + llms.txt out of the box

This makes Sleptons a **content asset**, not just an engagement tool.

### Q4. Startup tier unlocks private preset registry?
**Decision: DEFER to post-cold-start.**

Tier differentiation cannot be designed without real usage data. Pre-cold-start, every feature is free to everyone. After 90 days of Phase 0 funnel data, we'll know:
- What features OPC users actually use heavily
- What they're willing to pay to keep using past free limits
- What Startup-tier users in 中国 expect vs global market

Premature tier design = guessing. Wait for data.

Phase 5 revisit checklist (when cold start done):
- [ ] 500+ license issuances
- [ ] 100+ Sleptons Showcase entries
- [ ] Per-feature usage histogram from Phase 0 PostHog
- [ ] Top-3 features in OPC usage heatmap are candidates for Startup-tier limits
- [ ] Chinese founder pricing survey (ask via Sleptons community)

### Q5. Nebutra DB strategy — shared vs dedicated
**Decision: SHARED Nebutra Postgres with RLS + dedicated-DB escape hatch for Enterprise.**

Reasoning (the long-termist "hard + correct" path):

**Start shared (default)**:
- One `DATABASE_URL` per Nebutra deployment, all orgs share schema
- RLS already set up via `app.current_org_id` (done in earlier fix, survived audit)
- `getTenantDb(orgId)` enforces tenancy — no cross-tenant bleed possible
- Zero additional ops for 99% of customers (Individual/OPC/Startup)
- Cost: ~$30/mo for all of them combined vs $30+/mo per customer if dedicated

**Allow dedicated-DB per-tenant (escape hatch for Enterprise)**:
- `License.isolationMode` column: `shared` | `dedicated-db` | `dedicated-schema`
- When `dedicated-db`, `getTenantDb(orgId)` looks up `License.dedicatedDatabaseUrl` and routes to that DB
- Enterprise customers who need SOC2/ISO with dedicated data residency can opt-in
- Migration path: tenant starts shared, admin upgrades to dedicated — we do a one-time sync + switch routing

**Why not dedicated by default** (the tempting but wrong choice):
- For 99% of target users (OPC/Individual/Startup < 5 people), dedicated = over-engineered
- Ops burden scales linearly with tenant count — Nebutra would spend all time on DB ops instead of product
- Shared + RLS is how Linear / Vercel / Supabase themselves run (proven at scale)
- If an Enterprise customer *demands* dedicated from day one, they pay for it — but we don't pre-build infra for hypothetical demand

**Why not dedicated-schema-only** (the middle ground that looks attractive):
- Schema-per-tenant = Postgres metadata explodes at 1000+ tenants
- Schema-per-tenant migrations are an ops nightmare (run migration N times)
- Adds ~40% code complexity for ~5% customer benefit (they don't know the difference)

**License schema delta** (backwards-compat):
```prisma
model License {
  // ... existing fields ...
  isolationMode           String  @default("shared")       // "shared" | "dedicated-schema" | "dedicated-db"
  dedicatedDatabaseUrl    String? @map("dedicated_database_url")  // encrypted via @nebutra/vault
}
```

Default is `shared`. Enterprise license issuance triggers a human review to provision dedicated infra + set the URL.

---

## 11. Decision

Awaiting approval. If approved, Phase 0 starts immediately (instrumentation is a blocker for all later decisions).

Recommended order: **Phase 0 → Phase 1 → measure → decide Phase 2/3 prioritization → Phase 4 → Phase 5**.

Total effort estimate: 35-40h over 4-6 weeks (not parallelized) or 3-4 weeks with 1 person full-time on this stream.

---

## 12. Revision history

| Date | Author | Change |
|------|--------|--------|
| 2026-04-18 | Claude (draft) | Initial ADR proposed |
| 2026-04-18 | Claude + human review | Status → Accepted; Q1-Q5 resolved inline in §10; Phase 0 expanded to include PostHog CE + Umami + Metabase + Meilisearch stack |
