# Nebutra Microcopy Governance — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Productize the Nebutra Microcopy System (`docs/microcopy/nebutra-microcopy-system.md`) from a writing bible into a governed, machine-enforced product surface. Collapse all startup-OS user-facing copy toward ONE structured SSOT (`NebutraMicrocopy` type + Milestone Copy Pack + Easter Egg Registry in `@nebutra/brand/microcopy`) plus an i18n catalog (`startupOs.*` in `packages/platform/i18n/locales/{en,zh}.json`), wire the highest-fidelity product surfaces (empty / success / failure / milestone / graduation) to consume it, and enforce the 七禁令 with a config-driven, shrink-only lint ratchet that mirrors the existing `repositorySeam` pattern exactly. A zero-context engineer must be able to add the "1001st" microcopy string through the SSOT and have CI guarantee no new 禁令 violation slips into governed paths.

**Architecture:** One human-curated source per concern → derived consumption, mirroring the brand-governance collapse:
```
docs/microcopy/nebutra-microcopy-system.md   ← methodology SSOT (human prose, the bible)
        │  (Milestone Copy Pack §8.3, Easter Egg Registry §6.7, NebutraMicrocopy type §8.2)
        ▼
packages/design/brand/src/microcopy.ts        ← STRUCTURED SSOT (typed data, zero-dep)
   NebutraMicrocopy type · MILESTONE_COPY_PACK · getMilestoneCopy(id, locale)
   easter-egg-registry.json (schema §6.7) · EASTER_EGG_REGISTRY: EasterEggEntry[]
        │  exported via @nebutra/brand/microcopy subpath (matches @nebutra/brand/metadata)
        ▼
packages/platform/i18n/locales/{en,zh}.json   ← startupOs.* runtime catalog (10 State Categories)
   seeded from the Milestone Copy Pack + 黄金50条 (Phase 0)
        │  useTranslations("startupOs.*") in apps/web startup-os surfaces
        ▼
apps/web/src/components/startup-os/**          ← consume SSOT (empty/success/failure/milestone/graduation)
        ▲
governance.config.json → microcopyRules        ← CONFIG (banned patterns + shrink-only allowlist)
scripts/governance/lint-microcopy.mjs (engine, loadGovernanceConfig("microcopyRules"))
scripts/lint-microcopy.mjs (thin wrapper)  → wired into pnpm lint + CI lint-typecheck job
```
No new SSOT is invented: the methodology doc stays the prose source of truth; the typed module is its machine-readable projection; the i18n catalog is the runtime delivery; the ratchet flags any raw startup-OS literal that bypasses both. The 203-offender brand ratchet's exact shape is reused — only the patterns and seeded allowlist differ.

**Tech Stack:** TypeScript (strict), Vitest (`vitest.arch.config.ts` for architecture/governance guards, auto-discovers `tests/architecture/**/*.test.ts`), Biome (no `console.log` — scripts use `process.stdout.write`/`process.stderr.write`), next-intl (request config at `packages/platform/i18n/src/request.ts`, locales `["en","zh"]`), Sonner toasts re-exported as `@nebutra/ui/primitives`, `@nebutra/brand` (two-level-deep package `packages/design/brand`, already has subpath-export infra: `./metadata`, `./metadata-helpers`), pnpm workspaces (`minimumReleaseAge:1440` — mature/caret deps only). Commit straight to `main` in frequent small commits.

---

## Requirements & Audit Findings

A completed 3-agent audit (copy-violations / delivery-infra / governance-hook) established the current state. Treat as fact, but re-read each file to quote exact code before editing.

### Where copy lives (3 distinct surfaces, very different migration costs)

1. **next-intl catalogs** — `packages/platform/i18n/locales/{en,zh}.json` (~1,145 lines each). Wired into apps/web via `apps/web/next.config.ts` → `createNextIntlPlugin("../../packages/platform/i18n/src/request.ts")`; `routing.ts` defines `locales:["en","zh"], defaultLocale:"en"`. **Confirmed:** top-level keys are `admin, Common, theme, LocaleSwitcher, compliance, onboarding, userMenu, account, impact, auth, chat, billing, organizations, settings, legal, commandPalette, cookieConsent, notifications, dashboard, Sidebar` — there is **no `startupOs`, `milestone`, `graduation`, `revenue`, or `teamState` key**. The 10 microcopy State Categories have **zero** representation in the catalog.
2. **Hardcoded JSX/TSX literals** — the main uncontrolled surface. The entire `apps/web/src/components/startup-os/` directory (8 files) uses **zero** `useTranslations` calls; every string is hardcoded English inline. `startup-command-center.tsx` alone has ~40 visible copy strings.
3. **`toast()`/Sonner calls** — 12 of 14 toast sites in apps/web pass hardcoded English strings (`"Profile saved"`, `"Failed to save profile"`); only `design-system-shell.tsx:300,303,314` route through next-intl (`tSidebar("newProjectSuccess")`). Global `<Toaster/>` mounts once at `apps/web/src/app/[locale]/layout.tsx:127`.

There is **no** `@nebutra/microcopy` package, no `copyConstants.ts`, no `milestoneMessages.ts`. The Milestone Copy Pack (§8.3, 14 entries) and Easter Egg Registry (§6.7) have **zero** implementation surface; Milestone State and Graduation State have **zero** components.

### Current 七禁令 violations in governed paths (apps/web/src — primary scope)

The lint engine cannot do semantic validation (it can't judge whether an empty state lacks a 母题). It flags the **provably wrong**: explicit banned strings + generic empty-state patterns. The audit found these in `apps/web/src/` (the v1 governed scope):

- **禁七 · 空白状态缺母题 / 「暂无」** (~14 strings, highest volume): `notifications-dialog.tsx:187` (暂无通知 / 暂无更新日志), `startup-os/company/page.tsx:199` (`No company yet`), `usage/page.tsx:314` (`No usage data yet`), `integrations/page.tsx:333` (`No integrations available`), `settings/api-keys/ApiKeyList.tsx:45` + `components/api-keys/api-keys-list.tsx:74` (`No API keys yet`), `cofounder-match/matches-list.tsx:67` (`No matches yet`), `company-tower/control-deck.tsx:182` (`No bets placed yet`), `select-org/journey-state.ts:23,49,50` (`No workspaces yet`).
- **禁七 · 失败羞辱** (largest structural category, but most are technical error payloads, NOT product microcopy): user-facing offenders are `settings/api-keys/api-keys-client.tsx:33` (`Failed to create/load key`), `settings/provider-keys/provider-keys-client.tsx:37` (`Failed to save`). The most-visible product failures are in startup-os: `startup-chat-panel.tsx:74` (`STATUS_LABELS.error = "The turn failed"`), `:194` (`<AlertTitle>Conversation failed</AlertTitle>`), `startup-command-center.tsx` (8 × `setLastError("Failed to …")` rendered at `:801`). **Note:** `apps/web/src/app/api/**` route error bodies are NOT microcopy targets (excluded).
- **禁一/二/三/五/六** (over-incentive / empty 成功学 / self-moved / 尬梗 / 裸引用): **0 violations** in apps/web.
- **Emoji / exclamation**: **0** in apps/web product UI (one `✨` lives in the i18n catalog at `zh.json:1004` `"all":"你已经处理完了 ✨"` — an empty-state + emoji combo; the catalog is governed only via the i18n-side allowlist, see Phase 2). Landing-page emoji/赋能/闭环 violations are **out of scope for v1** (different writer persona, marketing surface).

### Existing governance machinery to mirror (confirmed by file read)

- `scripts/governance/_config.mjs` — `DEFAULTS` object (sections `rawInputs`, `repositorySeam`), `mergeSection()` (arrays replaced wholesale), `loadGovernanceConfig(section, cwd)` public API, eager `config` export. DEFAULTS allowlists are `[]` (fresh scaffold = zero debt).
- `governance.config.json` — currently ONE section: `repositorySeam` (coreDomains, seamPaths, dbAccessors, 26-file allowlist).
- `scripts/governance/lint-repository-seam.mjs` — the engine: `loadGovernanceConfig` → grep candidates → strip `// @seam-exempt:` → `newViolations = detected − allowlist` (FAIL), `fixedButListed = allowlist − detected` (FAIL, shrink-only) → `process.stdout/stderr.write`.
- `scripts/lint-repository-seam.mjs` — 21-line thin wrapper: `import "./governance/lint-repository-seam.mjs";`.
- `stripComments` helper at `scripts/lint-no-raw-inputs.mjs:53` (strips JS line + block comments before matching) — reuse this pattern.
- `package.json` `"lint"` chain (7 steps): `biome check . && node scripts/lint-no-raw-inputs.mjs && … && node scripts/lint-repository-seam.mjs`. **`pnpm lint` is NOT in CI today.**
- CI `lint-typecheck` job (`.github/workflows/ci.yml`): runs `pnpm test:arch`, `pnpm --config.verify-deps-before-run=false animation:governance` (the ONLY custom governance script in CI), `pnpm db:generate`, Biome on changed files, `pnpm turbo typecheck`, `pnpm --filter @nebutra/landing-page check:i18n`. The animation step is the precedent for adding a custom governance step.
- `@nebutra/brand` already exports subpaths `./metadata` (`brand`, `colors`, `faviconAssets`) and `./metadata-helpers`; `tsup.config.ts` entry array + `package.json` exports map are the extension points for a new `./microcopy` subpath.

**Chosen approach — "complete skeleton + convergence ratchet" (mirrors brand-governance Option B).** Build the full typed SSOT + i18n catalog + representative surface wiring + governance engine in one coherent pass; migrate the ~11 existing offender files **on-touch** via a shrink-only ratchet that reuses the `repositorySeam` shape exactly. Do NOT invent a parallel mechanism. Do NOT create a separate `@nebutra/microcopy` package — extend `@nebutra/brand` (brand voice is a design asset, same tier as `motion`/`positioning`).

---

## Decisions needed from the human

Resolve before (or during) the dependent phase. Each is non-blocking for skeleton work but load-bearing for content correctness or sequencing.

1. **SSOT package location (blocks Phase 1).** Recommended: extend `@nebutra/brand` with a `./microcopy` subpath (`packages/design/brand/src/microcopy.ts`), mirroring `@nebutra/brand/metadata`. Alternatives surfaced by audit: `packages/commerce/marketing` (straddles marketing/product — rejected, microcopy is product), or a new `@nebutra/microcopy` package (rejected — package overhead for minimal content). **Confirm `@nebutra/brand/microcopy`.**

2. **黄金50条 authorship model (blocks Phase 4 content gate).** Per §9.1 the Phase-0 acceptance gate is "团队盲读认出『同一个人写的』 + 回响层 ≤25% + 无一条触禁令". Are the 50 strings: (a) **AI-drafted then human-curated** (Claude drafts per the §5.3 SOP, a human runs the blind-read acceptance gate and signs off), or (b) **human-written** (the typed/i18n scaffold ships empty placeholders that a writer fills)? Recommended: (a) draft + (b) gate — the plan implements the structured slots and the acceptance-gate test harness either way; the **gate is human, the draft can be AI**.

3. **七禁令 ratchet CI-blocking timing — coordinate with the in-flight collision (blocks Phase 5 CI wiring).** `governance.config.json`, `package.json` `"lint"`, and `.github/workflows/ci.yml` are simultaneously edited by (a) the brand-meta governance plan (`2026-06-06-brand-meta-replacement-governance.md`, adds `brandLiterals` section + a CI step) and (b) the in-flight animation-governance work. Also: `pnpm lint` already exits 1 today on a pre-existing seam breach (`backends/gateway/src/inngest/functions/automationScheduler.ts`, per the brand plan's C1). **Decision:** does the microcopy ratchet (i) block CI immediately via its own explicit `node scripts/lint-microcopy.mjs` step (recommended — do NOT rely on `pnpm lint`, which is not in CI and is currently red), or (ii) land as a local-only `pnpm lint` step first and wire CI after the brand-meta + automations PRs resolve the shared-file collisions? Recommended: **(i) own explicit CI step, landed AFTER brand-meta + automations merge** (see multi-session constraint below).

4. **Web app i18n vs typed copy module for runtime delivery (affects Phase 3 surface wiring).** Two consumption models exist. Recommended hybrid: **Milestone Copy Pack is the typed SSOT** (`getMilestoneCopy(id, locale)` from `@nebutra/brand/microcopy`, zero-dep, used by the `MilestoneCelebration`/`GraduationCard` components and toast factory); **state-category strings (empty/success/failure/onboarding) go through `useTranslations("startupOs.*")`** so they participate in i18n key-parity checks. Confirm this split, or choose i18n-only / typed-only.

5. **Easter Egg Registry storage + overuse guard scope (Phase 1).** Store the registry as `packages/design/brand/src/easter-egg-registry.json` (schema §6.7: `{ id, layer, primaryCopy, secondaryCopy?, sourceInspiration, usedInSurface, riskLevel }`), seeded with the 4 canonical §6.3 examples (localhost / General Magic / ramen / first room). Should v1's lint also enforce the §6.7 防油 rule (same `sourceInspiration` not reused in adjacent surfaces), or defer that semantic check to Phase 6+ (recommended defer — v1 ships the registry as data + a schema-validity arch test only)?

---

## Phase Dependency Order

```
Phase 0  multi-session-gate     (dependsOn: —)        ← coordination + pre-flight, no code
Phase 1  structured-ssot        (dependsOn: 0)        ← @nebutra/brand/microcopy typed data + registry
Phase 2  i18n-startupos-catalog (dependsOn: 1)        ← startupOs.* keys in en/zh + key-parity guard
Phase 3  surface-wiring         (dependsOn: 1, 2)     ← empty/success/failure/milestone/graduation consume SSOT
Phase 4  golden-50-gate         (dependsOn: 1, 2)     ← Phase-0 production workflow + acceptance gate harness
Phase 5  qijinling-ratchet      (dependsOn: ALL)      ← 七禁令 shrink-only lint engine; seeds offenders LAST
```

> **Note on Phase 0:** like the brand plan's `brand-config-facts` gate, this is a no-code coordination gate. The microcopy work shares three files (`governance.config.json`, `package.json` `"lint"`, `.github/workflows/ci.yml`) with two other in-flight efforts. Phase 0 confirms ordering and quotes the exact current bytes of those files so the later edits are surgical.

---

## Phase 0 — Multi-session coordination gate (no code)

**Goal:** Sequence this work safely against the parallel brand-exec and animation-governance efforts that touch the same shared governance files, and capture the exact current state of those files so Phase 5 edits are conflict-free. **dependsOn: —.**

### Files
**Read-only (no modify):** `governance.config.json`, `package.json` (`"lint"` line 16), `.github/workflows/ci.yml` (lint-typecheck job), `docs/superpowers/plans/2026-06-06-brand-meta-replacement-governance.md` (Phase 8 + Convergence).

### Tasks
- [ ] **1. Confirm sequencing.** This plan's Phase 5 MUST land AFTER: (a) the brand-meta governance Phase 8 (it adds `brandLiterals` to `governance.config.json` + a CI step + resolves the pre-existing `automationScheduler.ts` seam breach that makes `pnpm lint` exit 1 today), and (b) any animation-governance edit to `.github/workflows/ci.yml`. Record the merge order in the PR description. Phases 0–4 are independent of those efforts and may proceed in parallel.
- [ ] **2. Snapshot shared-file bytes.** `git show HEAD:governance.config.json`, `git show HEAD:package.json`, `git show HEAD:.github/workflows/ci.yml` — record the exact `"lint"` chain and the lint-typecheck step list, so Phase 5 appends (never rewrites) the microcopy entries. Verify `microcopyRules` is NOT yet a key in `governance.config.json` (confirmed: only `repositorySeam` exists).
- [ ] **3. Prefer `git commit -- <file>` over `git add` then commit** for the three shared files (per the multi-session-coordination memory: parallel sessions silently overwrite + contaminate the index). No commit in this phase.

**Risk:** if Phase 5 lands before brand-meta Phase 8, the new CI step runs against a still-red `pnpm lint`; if it lands before the shared-file snapshot is current, a merge conflict silently drops another effort's section. Phase 0 is the mitigation.

---

## Phase 1 — Structured SSOT: `@nebutra/brand/microcopy` typed data + Easter Egg Registry

**Goal:** Project the methodology bible's machine-readable parts into a zero-dep typed module: the `NebutraMicrocopy` type (§8.2 verbatim), the `MILESTONE_COPY_PACK` (§8.3, 14 entries) as typed data, a `getMilestoneCopy(id, locale)` lookup, and the Easter Egg Registry (§6.7 schema) seeded with the 4 canonical §6.3 echoes. Exported via a new `@nebutra/brand/microcopy` subpath mirroring `@nebutra/brand/metadata`. **dependsOn: Phase 0.**

### Data flow after this phase
```
docs/microcopy/nebutra-microcopy-system.md §8.2/§8.3/§6.7   ← human prose SSOT
        │  hand-transcribed (one-time) into typed data
        ▼
packages/design/brand/src/microcopy.ts        NebutraMicrocopy · MILESTONE_COPY_PACK · getMilestoneCopy
packages/design/brand/src/easter-egg-registry.json   EasterEggEntry[] (4 seeded)
        │  @nebutra/brand/microcopy subpath
        ▼
consumed by Phase 3 components + Phase 4 golden-50 production
```

### Files
**Create:**
- `packages/design/brand/src/microcopy.ts` — exports: (1) `NebutraMicrocopy` type **verbatim from §8.2** (all union members exact: `act`, `stage` 9-stage, `surface` incl. `tool_recommendation`/`warning`, `voiceRegister` 5 registers, `userEmotion`, `culturalMotif` 7 motifs, `easterEggLayer`, `variables`, `riskLevel`, `sourceInspiration`, `notes`); (2) `MilestoneId` string-literal union (`first_room | first_folder | first_table | first_signal | first_ship | first_believer | first_revenue | first_return | first_team | first_crowd | first_reset | first_public | first_demo | graduation`); (3) `MILESTONE_COPY_PACK: readonly NebutraMicrocopy[]` — the 14 §8.3 rows as typed objects (zh + en `primaryCopy`, `act`, `voiceRegister`, `easterEggLayer` exactly as the table specifies; `first_crowd` is the only `echo` layer); (4) `getMilestoneCopy(id: MilestoneId, locale: "zh-CN" | "en-US"): { primary: string; secondary?: string; cta?: string }`; (5) `EasterEggEntry` type (§6.7 fields) + `EASTER_EGG_REGISTRY: readonly EasterEggEntry[]` imported from the JSON.
- `packages/design/brand/src/easter-egg-registry.json` — schema §6.7: `{ id, layer:"functional"|"metaphor"|"echo", primaryCopy, secondaryCopy?, sourceInspiration, usedInSurface, riskLevel:"low"|"medium"|"high" }`. Seed the 4 §6.3 echoes (localhost / General Magic / ramen / first room).
- `packages/design/brand/src/__tests__/microcopy.test.ts` — Vitest unit + invariant tests.

**Modify:**
- `packages/design/brand/package.json` — add `"./microcopy"` to the `exports` map (`types: "./dist/microcopy.d.ts"`, `import: "./dist/microcopy.js"`), mirroring `./metadata`.
- `packages/design/brand/tsup.config.ts` — add `"src/microcopy.ts"` as a 5th `entry`.
- `packages/design/brand/src/index.ts` — re-export `MILESTONE_COPY_PACK`, `getMilestoneCopy`, `EASTER_EGG_REGISTRY`, and the types.

### Invariants (enforced by tests)
- `MILESTONE_COPY_PACK.length === 14`; every entry has non-empty zh + en `primaryCopy`; `voiceRegister`/`act`/`easterEggLayer` match the §8.3 table.
- 回响层 ratio guard (§6.2): `entries.filter(e => e.easterEggLayer === "echo").length / 14 <= 0.25` (currently 1/14 ≈ 7%, well under the 25% ceiling — the test makes the ceiling machine-checked).
- Every `EASTER_EGG_REGISTRY` entry with `layer:"echo"` has a non-empty `sourceInspiration` (§8.2 "回响层必填") and a `secondaryCopy`; `sourceInspiration` values are unique within the registry (防重, §6.7).
- 七禁令 self-check: no string in `MILESTONE_COPY_PACK` or the registry contains `[🎉🚀🔥🌟⚡]`, `!`/`！`, or any §7.1 banned literal (恭喜/加油/赋能/闭环/…). The SSOT must itself pass the rules it governs.

### TDD tasks
- [ ] **1. Bootstrap brand vitest (if not already present from brand-meta Phase 0/M1).** Confirm `packages/design/brand/vitest.config.ts` exists and `packages/*/*/vitest.config.ts` is in `vitest.workspace.ts` projects (two-level-deep package). If missing, create the config + add the glob (coordinate — brand-meta plan's M1 may already do this). `pnpm --filter @nebutra/brand test 2>&1 | tail -5` → passWithNoTests. Commit: `chore(brand): ensure vitest discovery for two-level-deep package`.
- [ ] **2. RED: `MILESTONE_COPY_PACK` shape + count.** Create `__tests__/microcopy.test.ts` importing `MILESTONE_COPY_PACK` (module missing) + asserting length 14, each entry non-empty zh/en. Run → "Cannot find module '../microcopy'".
- [ ] **3. GREEN: create `microcopy.ts` with `NebutraMicrocopy` type + `MILESTONE_COPY_PACK`** (14 §8.3 rows transcribed). Re-run → PASS. Commit: `feat(brand): NebutraMicrocopy type + Milestone Copy Pack as typed SSOT`.
- [ ] **4. RED→GREEN: `getMilestoneCopy(id, locale)` lookup.** Test `getMilestoneCopy("first_folder","zh-CN").primary === "许多公司，最初只是一个文件夹。"` and the `en-US` branch. Add the helper. Commit: `feat(brand): getMilestoneCopy locale lookup`.
- [ ] **5. RED→GREEN: 回响层 ≤25% ceiling + voice/act/layer parity.** Add the ratio invariant + per-entry table-parity assertions. Should pass on correct data; RED only catches transcription errors. Commit: `test(brand): lock milestone pack echo-ratio ceiling + table parity`.
- [ ] **6. RED→GREEN: Easter Egg Registry schema + uniqueness.** Create `easter-egg-registry.json` (4 seeded), add `EasterEggEntry` type + import, test schema validity + echo→sourceInspiration-required + uniqueness. Commit: `feat(brand): Easter Egg Registry schema + 4 canonical echoes`.
- [ ] **7. RED→GREEN: SSOT self-passes 七禁令.** Add a test scanning all pack + registry strings for banned literals / emoji / exclamation → must be clean. Commit: `test(brand): microcopy SSOT self-satisfies the seven prohibitions`.
- [ ] **8. Wire subpath export + rebuild.** Add `./microcopy` export + tsup entry + index re-export; `pnpm --filter @nebutra/brand build && ls packages/design/brand/dist/microcopy.{js,d.ts}` → both exist. Commit: `feat(brand): expose @nebutra/brand/microcopy subpath`.

**Risks:** transcription drift from the bible (the §8.3 table is the authority — re-read lines 594–609 when transcribing); JSON-import of the registry needs `resolveJsonModule` (brand `tsconfig.json` — verify, add if absent); `getMilestoneCopy` must return a shape Phase 3 components consume (`{primary, secondary?, cta?}`).

---

## Phase 2 — i18n `startupOs.*` catalog + key-parity guard

**Goal:** Add a `startupOs` top-level key covering all 10 State Categories to both `packages/platform/i18n/locales/en.json` and `zh.json`, seeded with the Milestone Copy Pack (keyed by `MilestoneId`) and Phase-0 golden-50 slots, so startup-OS surfaces can read culturally-grounded copy via `useTranslations("startupOs.*")`. Guard en↔zh key parity with an arch test. **dependsOn: Phase 1.**

### Source-of-truth flow (one direction)
```
@nebutra/brand/microcopy MILESTONE_COPY_PACK   ← typed milestone copy
        │  hand-mirrored into i18n (milestone keys = MilestoneId)
        ▼
packages/platform/i18n/locales/{en,zh}.json  → startupOs.{onboarding,emptyState,successState,
   failureState,milestone,team,revenue,growth,deployment,graduation}
        │  useTranslations("startupOs.*")
        ▼
apps/web startup-os surfaces (Phase 3)
```

### Files
**Modify:**
- `packages/platform/i18n/locales/en.json` — add `startupOs` top-level key. Sub-structure mirrors §5.1: `startupOs.onboarding.*`, `.emptyState.*`, `.successState.*`, `.failureState.*`, `.milestone.<MilestoneId>` (14 keys mirroring `MILESTONE_COPY_PACK` en strings), `.team.*`, `.revenue.*`, `.growth.*`, `.deployment.*`, `.graduation.*`. Seed the golden-50 distribution (§9.2: 8 onboarding, 10 empty, 10 success, 12 milestone, 6 failure, 4 graduation).
- `packages/platform/i18n/locales/zh.json` — same structure, zh strings (milestone keys mirror `MILESTONE_COPY_PACK` zh).

**Create:**
- `tests/architecture/i18n-startupos-parity.test.ts` — (a) `startupOs` key tree is identical between en.json and zh.json (recursive key-set equality); (b) `startupOs.milestone.*` keys are exactly the 14 `MilestoneId`s and each value equals the corresponding `MILESTONE_COPY_PACK` `primaryCopy` for that locale (catalog ↔ typed-SSOT consistency — no drift); (c) every `startupOs.*` string passes the 七禁令 self-check (no banned literal/emoji/exclamation). Auto-discovered by `vitest.arch.config.ts`.

### TDD tasks
- [ ] **1. RED: parity + milestone-consistency test before keys exist.** Create `tests/architecture/i18n-startupos-parity.test.ts`. `pnpm test:arch --reporter=verbose 2>&1 | grep -E 'startupOs|FAIL|PASS'` → FAIL (no `startupOs` key).
- [ ] **2. GREEN: add `startupOs.milestone.*` (14 keys) to en + zh** mirroring `MILESTONE_COPY_PACK`. Re-run → milestone-consistency passes; parity passes for the milestone subtree. Commit: `feat(i18n): startupOs.milestone catalog mirrors Milestone Copy Pack`.
- [ ] **3. GREEN: add remaining state-category subtrees** (onboarding/emptyState/successState/failureState/team/revenue/growth/deployment/graduation) with golden-50 distribution slots (§9.2). These can ship as Phase-4-curated drafts. Re-run → full parity + 七禁令 self-check pass. Commit: `feat(i18n): startupOs state-category catalog (10 categories, golden-50 slots)`.
- [ ] **4. Smoke-typecheck consumers.** `pnpm --filter @nebutra/web typecheck` → 0 (no consumer yet, but confirms JSON validity). Commit if any fix.

**Risks:** en/zh drift on a single key fails CI — the parity test is the guard; the `✨` in `zh.json:1004` (`notifications.all`) is **outside** `startupOs` and not migrated here (it's a Phase-5 i18n-allowlist item, not a parity concern); golden-50 content correctness is gated in Phase 4, not here (Phase 2 ships the slots).

---

## Phase 3 — Wire representative product surfaces to consume the SSOT

**Goal:** Migrate the five highest-fidelity startup-OS surfaces — **empty / success / failure / milestone / graduation** — off hardcoded literals onto the SSOT (`useTranslations("startupOs.*")` for state copy, `getMilestoneCopy`/typed pack for milestones), and stand up the two missing State Category components (Milestone, Graduation) that have zero implementation today. **dependsOn: Phase 1, Phase 2.**

### Files
**Create:**
- `apps/web/src/components/startup-os/milestone-celebration.tsx` — `MilestoneCelebration` component taking a `MilestoneId`; renders the `MILESTONE_COPY_PACK` entry via `getMilestoneCopy` as a historian-register styled toast/card (no emoji, no exclamation — §5.2 Milestone rules). Follows component-generation rules (CLAUDE.md): `@nebutra/ui` primitives, `AnimateIn` for entrance, no raw `motion.div`.
- `apps/web/src/components/startup-os/graduation-card.tsx` — `GraduationCard` consuming `startupOs.graduation.*` (送别档 register, §5.2: "你出师了。下一程需要更强的装备。"); rendered when project `stage` advances to `series_a`/`post_a` or usage thresholds hit. Links to referral/external tool recommendation.
- Story files (REQUIRED per CLAUDE.md): `milestone-celebration.stories.tsx`, `graduation-card.stories.tsx`.
- Tests: `apps/web/src/components/startup-os/__tests__/milestone-celebration.test.tsx`, `__tests__/graduation-card.test.tsx`.

**Modify (surface migration — empty/success/failure):**
- `apps/web/src/components/startup-os/startup-chat-panel.tsx` — replace `STATUS_LABELS` object (`:74-80`) with `useTranslations("startupOs.successState"|".failureState"|".deployment")`: `done` → companion-register success copy, `error`/`The turn failed` → mentor-register failure copy; `Conversation failed` AlertTitle (`:194`) → `startupOs.failureState.conversation`.
- `apps/web/src/components/startup-os/startup-command-center.tsx` — empty-state literals (`:1431` `Select a file…`, `:1449` `Preview will appear…`) → `startupOs.emptyState.*`; the `StartupBuilderHome` headline (`:922-927`) → `startupOs.onboarding.headline`; the 8 `setLastError("Failed to …")` calls → mentor-register `startupOs.failureState.*` keys; wire `MilestoneCelebration` to the compile-success ("First Folder") + first-file-generated ("First Ship") moments.
- `apps/web/src/app/[locale]/(app)/startup-os/company/page.tsx` — `title="No company yet"` (`:199`) → `startupOs.emptyState.company` (First-Room metaphor).

### TDD tasks
- [ ] **1. RED→GREEN: `MilestoneCelebration` renders pack copy.** Test it renders `getMilestoneCopy("first_folder", locale).primary` and contains no emoji/exclamation. Create component + story. `pnpm --filter @nebutra/web test --run milestone-celebration`. Commit: `feat(startup-os): MilestoneCelebration component consuming Milestone Copy Pack`.
- [ ] **2. RED→GREEN: `GraduationCard` renders graduation copy.** Test it reads `startupOs.graduation.*` (送别 register) + no banned literal. Create component + story. Commit: `feat(startup-os): GraduationCard (out-of-basics, 送别 register)`.
- [ ] **3. RED→GREEN: chat-panel status labels via i18n.** Replace `STATUS_LABELS` with translation calls; test the failure state renders mentor-register copy, success renders companion-register, no `"The turn failed"`/`"Conversation failed"` literal remains. `pnpm --filter @nebutra/web typecheck` → 0. Commit: `feat(startup-os): chat-panel status copy from startupOs i18n`.
- [ ] **4. RED→GREEN: command-center empty/onboarding/failure migration + milestone wiring.** Replace the empty-state + headline + setLastError literals; wire `MilestoneCelebration` to the two milestone moments. typecheck → 0. Commit: `feat(startup-os): command-center copy from SSOT + milestone celebrations`.
- [ ] **5. RED→GREEN: company page empty state.** `No company yet` → `startupOs.emptyState.company`. typecheck → 0. Commit: `feat(startup-os): company empty state via startupOs i18n`.
- [ ] **6. Full arch + web suite green.** `pnpm test:arch 2>&1 | tail -10` + `pnpm --filter @nebutra/web test 2>&1 | tail -10`. Commit batch if needed.

**Risks:** startup-os components currently use ZERO `useTranslations` — adding the hook requires the component to be inside the `NextIntlClientProvider` tree (confirmed: mounted at `apps/web/src/app/[locale]/layout.tsx`); `MilestoneCelebration` must not double-fire (idempotent per milestone — track via the existing thread-item state, not a new store); these five files are also Phase-5 allowlist seeds — migrating them HERE means they must be **removed from the seed** in Phase 5 (the count drops; see Convergence).

---

## Phase 4 — 黄金50条 Phase-0 production workflow + acceptance gate harness

**Goal:** Operationalize §9 Rollout: a repeatable production workflow (the §5.3 SOP) for the golden 50 strings, plus a machine-checkable acceptance gate mirroring §9.1's門槛 — **回响层 ≤25% + 无一条触禁令 + blind-read "同一个人写的" sign-off**. **dependsOn: Phase 1, Phase 2.**

### Authorship model (per Decision 2)
Recommended hybrid: AI drafts each of the 50 strings via the §5.3 SOP (State Category → 9-stage emotion → motif → register → easter-egg layer → zh+en → §7.5 self-check); a human runs the blind-read gate and signs off. The plan ships the **slots, the gate test, and a drafting checklist** — the gate is human, the draft can be AI.

### Files
**Create:**
- `docs/microcopy/golden-50-production.md` — the Phase-0 production runbook: the §9.2 distribution (8 onboarding / 10 empty / 10 success / 12 milestone / 6 failure / 4 graduation = 50), the §5.3 per-string SOP, and the §9.4 step-3 instruction to populate the Easter Egg Registry as回响层 strings are written. References (does not duplicate) the bible.
- `tests/architecture/golden-50-acceptance.test.ts` — the machine-checkable half of the §9.1 gate, scanning `startupOs.*` (en + zh) + `MILESTONE_COPY_PACK`: (a) 回响层 entries ≤25% of milestone/easter-egg-tagged copy; (b) zero string trips the 七禁令 (banned literal / emoji / exclamation / 全大写吼叫 / startup-bro `crush it|10x|hustle|grind` in en); (c) count gate — the golden-50 slots are all non-empty (no placeholder `TODO`/`""`). The blind-read "同一个人写的" sign-off is **human** and recorded in `golden-50-production.md` (not automatable).

**Modify:**
- `packages/platform/i18n/locales/{en,zh}.json` — fill the golden-50 `startupOs.*` slots with curated/drafted content (the slots were created in Phase 2).

### TDD tasks
- [ ] **1. RED: acceptance-gate test before content is final.** Create `tests/architecture/golden-50-acceptance.test.ts`. `pnpm test:arch 2>&1 | grep -E 'golden-50|FAIL|PASS'` → FAIL (placeholder slots / count short). Commit the test first: `test(microcopy): golden-50 acceptance gate (echo≤25%, no prohibitions, full count)`.
- [ ] **2. Author the runbook.** Create `docs/microcopy/golden-50-production.md` (SOP + distribution + registry step). Commit: `docs(microcopy): golden-50 Phase-0 production runbook`.
- [ ] **3. GREEN: fill golden-50 slots** (AI-drafted per SOP, or human-written per Decision 2). Re-run gate → PASS. Commit: `feat(microcopy): golden-50 Phase-0 copy (10 State Categories)`.
- [ ] **4. Human blind-read sign-off.** Record the §9.1 acceptance ("团队盲读认出『同一个人写的』 + 回响层 ≤25% + 无禁令") in `golden-50-production.md`. Commit: `docs(microcopy): record golden-50 blind-read acceptance`.

**Risks:** the blind-read gate is irreducibly human (the engine can verify ≤25% + no禁令 but not "same author voice"); do NOT mark Phase 4 done on the machine gate alone; over-filling beyond 50 dilutes quality (§9.1 explicitly warns against jumping to 155 — keep Phase 0 at 50).

---

## Phase 5 — 七禁令 shrink-only lint ratchet (convergence engine) — GUARDS EVERYTHING

**Goal:** Wire a config-driven lint engine that flags 七禁令 violations + generic empty-state patterns in `apps/web/src`, seeds a shrink-only allowlist of the current ~11 offenders (minus any already migrated in Phase 3), integrates with `pnpm lint` + a dedicated CI step, and documents the on-touch migration in `CLAUDE.md` — mirroring the `repositorySeam` pattern exactly. **dependsOn: ALL prior phases (run LAST).**

### Files
**Create:**
- `scripts/governance/lint-microcopy.mjs` — config-driven engine; `loadGovernanceConfig("microcopyRules")`; grep per banned pattern across `scanRoots`; strip JS comments (reuse `stripComments` from `scripts/lint-no-raw-inputs.mjs:53`); `// @microcopy-exempt: <reason>` file-level escape hatch; `newViolations = detected − allowlist` (FAIL), `fixedButListed = allowlist − detected` (FAIL, shrink-only); `process.stdout.write`/`stderr.write` only.
- `scripts/lint-microcopy.mjs` — 21-line thin wrapper: `import "./governance/lint-microcopy.mjs";` (mirrors `scripts/lint-repository-seam.mjs:20`).
- `tests/architecture/governance/lint-microcopy.test.ts` — `mkdtempSync` fixture tests via `execFileSync("node",[enginePath],{cwd:tmpDir, env:{...process.env, LANG:"en_US.UTF-8"}})`: new-violation→exit1 / allowlisted→exit0 / stale-allowlist→exit1 / `@microcopy-exempt`→exit0.

**Modify:**
- `scripts/governance/_config.mjs` — add `microcopyRules` to `DEFAULTS` (after `repositorySeam`, ~line 62) with **empty** `allowlist` and `bannedPatterns: []` (fresh scaffold must NOT enforce Nebutra-specific Chinese copy rules — project-specific patterns live only in `governance.config.json`); add to the eager `config` export (lines 90–93, alongside `rawInputs`/`repositorySeam`) — do NOT disturb those two lines. Use UTF-8 literal Chinese, NOT Unicode escapes.
- `governance.config.json` — add `microcopyRules` sibling section: `scanRoots:["apps/web/src"]`, `excludePaths:["/api/","\\.test\\.tsx?$","/__tests__/","/storybook/src/stories/","/design-docs/","/sailor-docs/"]`, `bannedPatterns:[{pattern:"暂无数据|暂无通知|暂无更新日志|暂无",label:"禁七: 空白状态禁用「暂无」"},{pattern:"恭喜|太棒了|加油|冲鸭|梦想成真|你能行",label:"禁一: 过度激励"},{pattern:"赋能|闭环|抓手|颗粒度|打法|系统检测到|为了更好地服务您",label:"禁四: LinkedIn/老板味"},{pattern:"[🎉🚀🔥🌟⚡]",label:"禁标点: emoji"},{pattern:"\"No [A-Za-z].*?(yet|available)\"",label:"禁七: 空状态缺母题"}]`, `allowlist:[ /* seeded offenders */ ]`.
- `package.json` — append `&& node scripts/lint-microcopy.mjs` to the `"lint"` chain (line 16, after `lint-repository-seam.mjs`); add `"lint:microcopy": "node scripts/lint-microcopy.mjs"` alias.
- `.github/workflows/ci.yml` — add an explicit step in the lint-typecheck job, **after** the "Verify animation governance" step (and after brand-meta's "Governance lint guards" step if it lands first): `- name: Verify microcopy governance` / `run: node scripts/lint-microcopy.mjs`. Do NOT rely on `pnpm lint` (not in CI, and red until brand-meta resolves the seam breach).
- `CLAUDE.md` — insert `## Microcopy — seven-prohibition rule (lint-enforced)` after the repository-seam `---` separator, before `## What NOT to do`: governed path (`apps/web/src`), the 5 banned-pattern families, `// @microcopy-exempt: <reason>` hatch, before/after example, shrink-only on-touch note, create-sailor distribution.
- `packages/ops/create-sailor/src/utils/governance-lints.ts` — add a `MICROCOPY_CMD` + a `microcopyRules` section (empty allowlist + empty bannedPatterns DEFAULTS, like `rawInputs`) to the emitted scaffold `governance.config.json`; extend the lint-cmd regex to match `lint-microcopy`. Add coverage to `governance-lints.test.ts`. (Mirrors brand-meta H7.)

### Seed the allowlist (after Phase 3 migrations land)
The audit found ~11 offender files. Phase 3 migrates 5 of them (`startup-chat-panel.tsx`, `startup-command-center.tsx`, `startup-os/company/page.tsx` — already clean) so the **seed is the remainder**, exact relative paths (repo-root-relative, `p.replace(/^\.\//,"")` normalized to match `lint-repository-seam.mjs:89-90`):
```
apps/web/src/components/notifications/notifications-dialog.tsx
apps/web/src/app/[locale]/(app)/usage/page.tsx
apps/web/src/app/[locale]/(app)/integrations/page.tsx
apps/web/src/app/[locale]/(app)/settings/api-keys/ApiKeyList.tsx
apps/web/src/components/api-keys/api-keys-list.tsx
apps/web/src/components/cofounder-match/matches-list.tsx
apps/web/src/components/startup-os/company-tower/control-deck.tsx
apps/web/src/app/[locale]/select-org/journey-state.ts
apps/web/src/app/[locale]/(app)/settings/api-keys/api-keys-client.tsx
apps/web/src/app/[locale]/(app)/settings/provider-keys/provider-keys-client.tsx
```
Re-run the seeding grep after Phase 3 to confirm the exact set; seed only files that still match.

### TDD tasks
- [ ] **0. Pre-flight: confirm `pnpm lint` is green (or CI step is standalone).** Per Decision 3 + Phase 0: brand-meta Phase 8 must have resolved the pre-existing `automationScheduler.ts` seam breach (or the microcopy CI step runs `node scripts/lint-microcopy.mjs` directly, not `pnpm lint`). Confirm the three shared files match the Phase-0 snapshot + the other efforts' additions before editing. No commit.
- [ ] **1. RED: engine fixture tests.** Create `tests/architecture/governance/lint-microcopy.test.ts` (4 fixtures via `execFileSync`). `pnpm test:arch --reporter=verbose tests/architecture/governance/lint-microcopy.test.ts 2>&1 | tail` → FAIL (MODULE_NOT_FOUND).
- [ ] **2. Add `microcopyRules` to `_config.mjs`** DEFAULTS (empty allowlist + empty bannedPatterns) + config export (UTF-8 Chinese; do not disturb lines 91-92). Config-load assertions go GREEN; engine tests still fail.
- [ ] **3. Implement `scripts/governance/lint-microcopy.mjs`** (engine: grep per `bannedPatterns`, `excludePaths` filter, `stripComments`, `@microcopy-exempt` hatch, dual shrink-only ratchet). 4 engine fixture tests GREEN. Commit: `feat(governance): microcopy 七禁令 lint engine (config-driven, shrink-only)`.
- [ ] **4. Thin wrapper.** Create `scripts/lint-microcopy.mjs`. `node scripts/lint-microcopy.mjs 2>&1 | tail` → exit 1 (finds real offenders — delegation works).
- [ ] **5. Seed `governance.config.json` `microcopyRules`** with the post-Phase-3 offender set (re-run the seeding grep first). `node scripts/lint-microcopy.mjs` → exit 0, "✓ microcopy: N known allowlisted file(s), 0 new." Commit: `chore(governance): seed microcopy allowlist (shrink-only)`.
- [ ] **6. Wire into `lint` + alias.** Append the step + alias to `package.json`. `pnpm lint` last step reports allowlisted count, 0 new (gated on the rest of the chain being green per task 0). Commit.
- [ ] **7. Add dedicated CI step.** `- name: Verify microcopy governance / run: node scripts/lint-microcopy.mjs` after the animation step. `grep -n 'Verify microcopy governance' .github/workflows/ci.yml` → found. Commit.
- [ ] **8. create-sailor distribution.** Add `MICROCOPY_CMD` + empty `microcopyRules` to the emitted scaffold config + lint-cmd regex match + `governance-lints.test.ts` coverage. `pnpm --filter create-sailor test 2>&1 | tail` → green. Commit: `feat(create-sailor): ship microcopy governance ratchet (empty allowlist)`.
- [ ] **9. Document in `CLAUDE.md`.** Insert the rule section. `grep -n 'Microcopy.*prohibition\|@microcopy-exempt\|microcopyRules\.allowlist' CLAUDE.md` → ≥3 matches. Commit.
- [ ] **10. Verify one real on-touch migration.** Migrate `apps/web/src/components/cofounder-match/matches-list.tsx` (`No matches yet` → `startupOs.emptyState.matches` First-Believer metaphor), remove its allowlist entry, `node scripts/lint-microcopy.mjs` → count decremented by 1, 0 new. Commit: `feat(microcopy): migrate matches-list empty state — first on-touch migration`.

**Risks:** `pnpm lint` is red today (pre-existing seam breach) and not in CI — the microcopy CI step MUST be standalone (`node scripts/lint-microcopy.mjs`), not `pnpm lint`; UTF-8 Chinese literals (use literals, not `\u` escapes) + `LANG=en_US.UTF-8` grep prefix for CI byte-safety; the engine flags the **provably wrong** only (it cannot validate 母题 presence — that stays human, gated in Phase 4); the `"No X yet"` regex must be anchored to string-literal context to avoid false positives on prose; fresh scaffolds get empty `bannedPatterns` (Nebutra-specific Chinese rules do not leak into other projects); when editing `governance.config.json`/`package.json`/`ci.yml`, prefer `git commit -- <file>` (multi-session safety).

---

## Convergence (on-touch ratchet)

The ~11 current 七禁令 offender files (post-Phase-3, the remainder) shrink monotonically via the shrink-only allowlist in `governance.config.json → microcopyRules.allowlist`, exactly mirroring the established `repositorySeam` ratchet and the sibling `brandLiterals` ratchet:

1. **Seed once (Phase 5).** All current offenders are listed in `microcopyRules.allowlist`. CI passes because every offender is grandfathered.
2. **New violations fail immediately.** Any new file (or a previously-clean file gaining a `暂无`/`No X yet`/banned literal/emoji in `apps/web/src`) is in `detected` but not `allowlist` → `newViolations` non-empty → the dedicated CI "Verify microcopy governance" step exits 1. The author must route the string through `@nebutra/brand/microcopy` (`getMilestoneCopy`/pack) or `useTranslations("startupOs.*")` with §05-compliant copy — never hardcode a generic empty/failure literal.
3. **On-touch migration shrinks the list.** When an engineer edits any allowlisted file for any reason, they replace its literals with SSOT-routed, 母题-grounded copy AND delete its allowlist entry in the same PR. If they migrate but forget to remove the entry, the engine's `fixedButListed` check (`allowlist − detected`) fails the build with "no longer contain raw microcopy literals — remove them from microcopyRules.allowlist (the list is shrink-only)". The list can therefore only ever shrink.
4. **Escape hatch for genuine exceptions.** Files that legitimately render non-microcopy system text (e.g. a debug surface, or a technical label that is provably not user-facing creative copy) add a top-level `// @microcopy-exempt: <reason>` comment, honored by the engine — these stay correct without bloating the allowlist permanently. API route error payloads are excluded structurally via `excludePaths` (`/api/`), not the allowlist.
5. **Permanent exemptions** (stories, `__tests__`, design-docs/sailor-docs previews) live in `excludePaths`, not the allowlist — they are intentionally illustrative.
6. **Scaffold inheritance.** Because the engine reads `governance.config.json` (no hardcoded monorepo paths, empty DEFAULTS for `allowlist` and `bannedPatterns`) and lives under `scripts/governance/`, `create-sailor` ships it into every scaffolded project with an empty allowlist + empty patterns — new projects opt into their own microcopy rules without inheriting Nebutra's Chinese-specific禁令.

End state: as files are touched over time, `microcopyRules.allowlist` drains toward `[]`, at which point every empty/success/failure/milestone/graduation string in `apps/web/src` flows from the single `@nebutra/brand/microcopy` typed SSOT or the `startupOs.*` i18n catalog — and the bible's promise ("a machine that produces a thousand strings that all read as written by one person") is structurally enforced, not just documented.

---

## Multi-session constraint (explicit)

This implementation MUST be sequenced and coordinated:

1. **Sequence AFTER the brand-exec workflow.** The brand-meta governance plan (`docs/superpowers/plans/2026-06-06-brand-meta-replacement-governance.md`) is a sibling effort landing first. Its Phase 8 (a) adds the `brandLiterals` section to `governance.config.json`, (b) resolves the pre-existing `automationScheduler.ts` seam breach that makes `pnpm lint` exit 1 today, and (c) establishes the precedent CI "Governance lint guards" step. Phases 0–4 of this plan are independent and may run in parallel, but **Phase 5 (the ratchet wiring) lands after brand-meta Phase 8** so `pnpm lint` is green and the shared files are in a known state.

2. **Coordinate with parallel animation-governance work on shared files.** Three files are simultaneously edited by this plan, the brand-meta plan, and the in-flight animation-governance effort: `governance.config.json` (each adds an independent JSON section — `microcopyRules` / `brandLiterals` / none-yet — which do NOT semantically conflict but DO textually collide), `package.json` `"lint"` (each appends a step), and `.github/workflows/ci.yml` (each adds a CI step). Per the multi-session-coordination memory: parallel edits silently overwrite and contaminate the index. Mitigations: (a) land microcopy's Phase 5 **after** the other two efforts merge to `main` (smallest, last); (b) snapshot the shared-file bytes in Phase 0 and **append** (never rewrite); (c) use `git commit -- <file>` for the three shared files rather than `git add` + commit; (d) the three `governance.config.json` sections are independent keys and the three CI steps are independent YAML blocks, so semantic conflict is impossible — only textual merge conflicts, resolved by re-snapshotting before each shared-file edit.

3. **Re-verify the offender count at Phase 5.** Phase 3 migrates 5 of the ~11 offenders, so seed only the remainder (re-run the seeding grep after Phase 3 lands), exactly as the brand plan re-verifies its <203 count after Phases 3/5.
---

## Pre-execution corrections (from adversarial review)

> 2-lens review (completeness / governance-consistency) — full findings in `2026-06-06-microcopy-governance.reviews.json`. Binding. Implementation is sequenced AFTER the brand-meta exec workflow; coordinate shared governance files.

### 🔴 CRITICAL

- **MC-C1 · Prior microcopy governance ALREADY EXISTS.** `tests/architecture/microcopy-governance.test.ts` is already in the repo (a previous session shipped partial copy governance, e.g. "no 🚀 in launch copy"). The implementer MUST read it FIRST and EXTEND it — do not create parallel/conflicting test files, do not duplicate its checks. Reconcile the new ratchet with whatever it already enforces.
- **MC-C2 · `_config.mjs` / `governance.config.json` collision with brand-meta Phase 8.** Both efforts add a new section to `scripts/governance/_config.mjs` DEFAULTS + the eager `config` export AND a new section to `governance.config.json`. They edit the same regions. Microcopy's `microcopyRules` section must be added AFTER brand-meta's `brandLiterals` lands (or in one coordinated change), never racing the same lines. ALSO: the plan's claim that "brand-meta Phase 8 resolves the automationScheduler.ts seam breach" is FALSE — that's a separate pre-existing repository-seam breach owned by the automations work; do not depend on Phase 8 for it. Verify the real `_config.mjs` shape before editing (audit found only `rawInputs` + `repositorySeam` sections today; line numbers in the draft are approximate).
- **MC-C3 · brand vitest already present.** `packages/design/brand/vitest.config.ts` already exists — do NOT re-bootstrap it; just add test files.

### 🟠 HIGH

- **MC-H1 · Honest ratchet scope — only ~3 of 7 禁令 are mechanically lintable.** The lint engine can reliably flag: emoji (🎉🚀🔥…), trailing `!`/全大写吼叫, 禁四 LinkedIn-味 keyword list (赋能/闭环/抓手/颗粒度/打法/请您/系统检测到), 禁七 generic empty-state patterns (暂无…/`No .* (yet|available)`), and a partial 禁一 激励词 list (加油/你能行/冲鸭/梦想成真). It CANNOT judge 禁二 (空洞成功学), 禁三 (自我感动), 禁五 (尬梗/谐音), 禁六 (裸引用), or §6.5 IP/legal 红线 — those need HUMAN review via the 黄金50 acceptance gate + PR review. The plan must STATE this split explicitly and not claim the ratchet enforces all seven.
- **MC-H2 · Data-model bug: `act` has no `纵贯` value.** `NebutraMicrocopy.act` is `'starting'|'building'|'growing'`. Per §4.4, Failure & Milestone are THROUGHLINES (横切纵贯线), not a 4th act. Model them with a separate field (e.g. `throughline?: 'failure' | 'milestone'`) and give 'First Reset' its real act — never `act: '纵贯'`.
- **MC-H3 · `NebutraMicrocopy` type must carry ALL §8.2 fields** — `id`, `locale`, `secondaryCopy?`, `ctaCopy?`, and `surface` must include `graduation` (the catalog uses `startupOs.graduation.*`). Don't drop fields.
- **MC-H4 · Resolve the locale contradiction in MILESTONE_COPY_PACK.** The pack stores bilingual (zh+en) per milestone, but `locale` is a scalar field. Pick ONE model: either each entry is a locale-keyed map (`{ "zh-CN": {...}, "en-US": {...} }`) OR one row per (id, locale). State it and make the type match.
- **MC-H5 · Anchor the lint regexes to JSX/string-literal context.** `No [A-Za-z].*(yet|available)` etc. must only match within rendered string literals/JSX text, not comments/identifiers/API error bodies (`apps/web/src/app/api/**` excluded). Otherwise false positives flood the allowlist.

### 🟡 MEDIUM

- **MC-M1 · Easter Egg Registry = echo-layer only** (bible §6.7: 「每条回响层彩蛋入库」). The `EasterEggEntry` type should not force functional/metaphor layers into the registry; register echo-layer entries (the防侵权/防油 concern is echo-specific).
- **MC-M2 · Remove the 🎉 from the plan's OWN proposed `fixedButListed` error string** (a microcopy-governance tool emitting an emoji is self-contradictory). Mirror the brand ratchet's plain-text message.
- **MC-M3 · Scenario Copy Matrix (§8.4) + Phase-1 expansion to 155 (§9.3)** are out of v1 scope — say so explicitly as deferred deliverables, don't silently drop them.
- **MC-M4 · 黄金50 milestone double-count**: Phase 4's 黄金50 includes 12 Milestone strings while Phase 2 already seeds 14 MILESTONE_COPY_PACK entries into the catalog — clarify that the 50 curate/upgrade existing seeds, not add 12 more on top.
- **MC-M5 · §6.5 IP/legal 红线 + §6.3 双层铁律 + §6.4 隔一层** are human-review gates in the 黄金50 acceptance checklist (not lintable) — add them to that checklist explicitly so they aren't lost.

### Multi-session constraint (restate)
Implementation runs AFTER the brand exec workflow (`wf_d0fe9d94-76e`) and must coordinate with the in-flight animation-governance work on `governance.config.json` / `package.json` / `ci.yml`. Seed the microcopy ratchet's shrink-only allowlist with the ~14 empty-state + the startup-os failure-copy violations the audit found; it may only shrink thereafter (on-touch migration through the SSOT).
