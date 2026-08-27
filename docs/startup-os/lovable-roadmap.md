# Startup OS → Lovable-grade Product — Build Roadmap

Status: In progress · Started 2026-06-05 · Driven by an autonomous `/loop` + multi-agent `Workflow`s.

## Direction (locked 2026-06-05)

**Fork B — keep the Founder-OS identity, graft Lovable's mechanics.**

Startup OS stays "a founder compiles one thesis into a whole company"
(`CompanyContext` + brand + landing + MVP scaffold + demand map + governance),
but adopts Lovable's signature mechanics and craft:

1. **Streaming generation (SSE)** — Lovable's signature. Today `executeStartupRun`
   is synchronous `generateText` returning JSON. Move to streamed plan-narration +
   live file writes.
2. **Conversational iteration** — "再加一个定价页" / "make the hero purple". Today
   runs are fixed pre-compiled steps; add a natural-language chat loop that mutates
   files + artifacts.
3. **Polished Lovable-grade UI** — current command center is functional but visually
   utilitarian ("很丑/混乱"). Redesign to Lovable polish using ONLY the design system
   (`@nebutra/ui`, `@nebutra/ui/primitives`, `@nebutra/icons`, tokens, `AnimateIn`).
   No hand-crafting (手搓禁止).
   → **Entry-surface (command-center hero "What are we building?") redesign spec:
     `docs/plans/2026-06-05-startup-os-home-redesign-design.md`** — 3-band narrative
     ("one sentence → a whole *governed* company"), brand-gradient ambient hero +
     arena-varying example theses, 5-card artifact strip (Governed-runs = differentiator
     hero), real-projects-only gallery (NO fabricated samples). Locked trade-offs in §6.
     Consume this when polishing the command-center hero (~L50/L801–898).
4. **Root-cause de-mock (根治)** — wire the Cloud/More surfaces (Usage, Payments,
   Logs, Security) to the REAL backends (`@nebutra/metering`, `@nebutra/billing`,
   `@nebutra/audit`). NOTE: reel/atelier/cinema "mock provider" demos are *deliberate
   keyless demos* — classify, do not blindly rip out.

## Decisions (locked 2026-06-05, by user)

- **Preview fidelity = server sandbox** (`@nebutra/sandbox-runtime`) — true full-stack
  "run the whole company", not static-HTML or in-browser Sandpack. Heaviest path.
  Open sub-decision deferred to the preview phase: **which sandbox provider** the
  runtime routes to (local Docker / remote e2b / Vercel Sandbox) — may need infra + keys.
  Note `@nebutra/code-execution` is self-marked WIP (notebook kernel + approval UI not wired).
- **Scaffold = TanStack Start** (decided 2026-06-05) — `buildStartupProjectFiles` (`files.ts`)
  must emit a TanStack Start app (was Vite+React SPA), matching the user's "Tanstack Lovable Core"
  reference + the server-sandbox preview. Canonical: `@tanstack/react-start` + `@tanstack/react-router`,
  `vite.config.ts` (`tanstackStart()` before `viteReact()`), `src/router.tsx` + `src/routes/__root.tsx`
  + `src/routes/index.tsx`, no `index.html`/`main.tsx`, `routeTree.gen.ts` auto-generated. Consequence:
  static-HTML preview can't render SSR → preview becomes sandbox-dependent (placeholder until sandbox lands).
- **Providers = wire all + region routing** — add SiliconFlow (硅基流动, OpenAI-compatible,
  `baseURL` already in `ai-providers/meta.ts`) + keep OpenRouter/Anthropic/OpenAI into
  `agents/src/fallback.ts` (`ENV_KEY_BY_PROVIDER` + `createFallbackModel` switch + `FallbackProviderName`),
  routed by tenant region. Today only openrouter/anthropic/openai are actually executable.

## Constraints

- **Keyless-testable**: every engine takes an injected model streamer (like
  `executeStartupRun`'s `invokeModel?`). Unit tests never need a real key.
- **Live API keys** (SiliconFlow / OpenRouter / …) come from the user only at the
  live-E2E phase (P6). Ask then; do not block earlier phases on keys.
- **TDD** (RED→GREEN), Biome lint, `tsc` typecheck, repository-seam + primitive-only
  + phosphor-marketing-only governance all apply.
- **Commit straight to `main`** (per user workflow); `git commit -- <files>`.
- `@nebutra/agents` already exports both `runWithFallback` and `streamText`.

## Phases (each ≈ one or more loop iterations, run via Workflow)

| # | Phase | Output |
|---|-------|--------|
| P0 | Foundation & contract | Discovery workflow: agents-streaming API, mock classification, UI redesign spec, engine/SSE contract |
| P1 | Streaming conversation engine | `lib/startup-os/conversation.ts` (async-generator, injectable streamer, plan-narration + reuse `GeneratedRunResultSchema` patches) + store event types `conversation_*` + tests |
| P2 | SSE chat API route | `POST /api/startup-os/projects/[id]/chat` → `text/event-stream`; auth/tenancy/metering/audit; persist turn; route tests |
| P3 | Conversational UI | "Ask Startup OS" studio: live streaming plan + file writes + preview refresh, suggestion chips, cancel-streaming, prompt history |
| P4 | Lovable-grade visual redesign | Hero/prompt studio, refined layout/typography/spacing, Code/Preview/Files/Cloud tabs, `AnimateIn`, tokens |
| P5 | Cloud/More surfaces → real backends | Usage(`metering`), Payments(`billing`), Logs/Security(`audit`); de-mock per P0 classification |
| P6 | Provider chain + live E2E | Add SiliconFlow to `@nebutra/agents` fallback; live streaming run (needs user key) |
| P7 | Maturity | Tests ≥80%, Playwright e2e, error/empty states, a11y, graduate from `STARTUP_AGENT_OS_PROTOTYPE` gate |

## Status

- **P0 DONE** (2026-06-05) — discovery workflow; contract at `docs/startup-os/p1p2-contract.md`,
  UI redesign spec + de-mock inventory captured.
- **P1/P2 DONE** (2026-06-05, commit `5b967b33`) — streaming conversation engine
  (`lib/startup-os/conversation.ts`) + SSE chat route (`api/startup-os/.../chat`). 66/66 green.
- ⚠️ **Multi-session collision**: another session is actively committing dashboard chrome
  (`5023e148` remove mock seed workspaces from sidebar, `fb42789f` sidebar collapse toggle).
  → **P3.5 Home redesign DEFERRED** (touches `workspace/page.tsx`/dashboard — their territory).
  Stay in startup-os files this session. Re-check before touching dashboard chrome.
- **P3a DONE** — SSE client hook (`use-startup-conversation.ts`) + chat panel
  (`startup-chat-panel.tsx`), both keyless-testable.
- **P4 DONE** (2026-08-20) — `startup-command-center.tsx` 1889 → 532 lines; six extracted
  surfaces (builder home, workspace shell, thread / files / canvas panels, run-status badge),
  each with a Storybook story. Regions separate by gutter + tonal shift rather than rules; every
  text/surface pair clears 4.5:1; loading / empty / error hold the loaded geometry.
  **Not yet eyeballed in a browser** — the evidence is a passing Storybook build. Run
  `pnpm --filter @nebutra/storybook dev` and look at "Startup OS/Workspace Shell" before
  treating the craft half as accepted.
- **P5 DONE** (2026-08-20) — all seven de-mock targets wired; see the list below for what each
  one landed on and what is deliberately still open.
- **P6 NEXT** — add SiliconFlow to the `@nebutra/agents` fallback chain and run a live streaming
  session. Needs a provider key from the user.

### Left open on purpose after P5

- `api_calls` has ingest nowhere in the repo, so that breakdown group renders only once
  something meters it. Skipped rather than shown empty.
- Usage "Historical Trends" was removed, not built: `MemoryProvider.getUsageHistory` re-queries
  the current period each iteration, so a chart on it would draw a wrong graph in dev.
- The referral reward ladder states invite counts, not payouts. Credits are recorded per claim
  with no balance to spend them from, and there is no revenue-share ledger — the economics are a
  product decision that has to precede the numbers.
- Export in local dev: `LocalUploadProvider` presigns to an upload server this app does not run,
  so exports fail locally unless S3/R2 or Vercel Blob is configured.
- `DELETE /api/notifications/[id]` still returns `{archived:true}` unconditionally via the
  error-swallowing `markAsRead`; `markAsRead` swallows its own provider errors the same way the
  unread path used to. Same defect, adjacent lines, not yet fixed.
- Query keys repo-wide omit `orgId` (`queryKeys.*.list()` is called bare everywhere), so an org
  switch can paint the previous tenant's cached figures before the refetch resolves. Repo-wide
  convention, not a referral-specific bug.

## De-mock inventory (P5 — 2026-06-05 audit; classification = "wire-real" only)

Genuine de-mock targets where a REAL backend exists but the UI shows fake/coming-soon.
(reel/atelier/cinema mock-providers + Array.from skeletons are intentional — NOT listed.)

**🔴 Security/correctness bugs (highest priority):**
- `lib/auth.ts:175` — Better Auth branch returns hardcoded `org_role:'org:admin'` →
  every non-Clerk user treated as admin. Mirror the Clerk branch (read real session claims).
- `lib/api.ts:87-90` — `const token = session?.userId ? undefined : undefined` →
  signed-in users send unauthenticated requests. Mint a real token from the session.
- `api/admin/impersonate/route.ts` — sets HMAC cookie but `getAuth()` never consumes it
  (`_verifyImpersonationCookie` already written, just not called) → impersonation is a no-op.

**🟡 Coming-soon / stub → wire to existing backend:**
- `admin/page.tsx` — KPI cards hardcoded "TBD" → `@nebutra/billing` (MRR/ARR) + `@nebutra/metering` (AI cost, WAU).
- `usage/page.tsx:155` — "Usage Breakdown coming soon" + dead quick-action cards → `@nebutra/metering` time-series (gold.ts pattern).
- `api/account/route.ts` — email-change doesn't send → `@nebutra/notifications`/`@nebutra/email`.
- `api/account/export` — stub URL in in-process Map → `@nebutra/uploads` presigned + `@nebutra/queue`.
- `settings/webhooks/page.tsx:59` — Edit is a no-op stub → reuse existing PATCH route + dialog.
- `growth/referral-panel.tsx` — "coming soon" (Referral Prisma model exists, API routes unbuilt) → build `/api/referrals/*`.
- `api/notifications/[id]` — mark-as-unread silently no-ops → implement provider method or 501.

## Home (workspace) redesign — P3.5 (decided 2026-06-05: hybrid prompt-first)

Target file: `apps/web/src/app/[locale]/(app)/workspace/page.tsx` (+ new components).
Reference: Perplexity home (one focal prompt, restrained, balanced). Division of labor:
**Home = global launcher/router; Startup OS = the deep builder.** Build AFTER P1/P2 commits
(disjoint files, sequence for clean commits). Same Lovable-grade craft as P4.

Why it's bad today: `WorkspaceMetrics` does `return null` when `getGrowthSummary` is empty
(`page.tsx:103`) → in dev/new-tenant the 4-tile grid vanishes → greeting + a lone document
card in a void. No empty state. Off-brand orange accent. No focal point.

**Zone 1 — Command hero (centered, upper third):**
- Replace greeting-only `DashboardCommandSurface` with: small date + greeting (smaller) +
  a prominent **`PromptInputBox`** (`@nebutra/ui/components`), placeholder "问 Sailor:今天做什么?".
  `onSend` routes intent. Container `max-w-[var(--container-text)]` centered.
- Primary action = `var(--brand-gradient)` (NOT orange).
- Suggestion chips routing intent (leading `@nebutra/icons`, `AnimateIn preset="scale"` stagger):
  编译一家公司→`/startup-os` (prefill thesis) · 解析文档→document uploader · 工作区信号→metrics ·
  连接应用→`/connectors`. v1 = keyword/chip routing (no LLM); later the prompt classifies intent via the agent.

**Zone 2 — Operating picture (below, graceful empty):**
- Responsive strip: 活跃 Startup OS 项目 (top 3 from `listStartupProjects`) · 最近运行/活动
  (rollouts/sessions) · 关键信号 (1-2 metrics IF `getGrowthSummary` has data).
- CRITICAL: each sub-panel renders a real `EmptyState` (`@nebutra/ui/layout`) when no data —
  e.g. "还没有项目 — 上面问一句开始" — never `return null` into a void.
- Whole zone empty (new tenant) → collapses to one slim "从这里开始" hint; hero carries the page.
- Keep document pipeline but demote to a card / chip-routed action, not a standalone hero card.

**Accent fix:** sidebar active-state + Home chrome must use brand tokens (`blue-9` / brand-gradient),
not the amber theme accent. (Semantic amber on a "conversions" metric tone is fine.)

**Constraints:** NO mock data — operating picture shows only real data with honest empty states
(this also resolves part of the de-mock mandate). Primitive-only, AnimateIn, tokens, no hand-crafting.

## Surface map (verified 2026-06-05)

- Core logic: `apps/web/src/lib/startup-os/*.ts` (canvas, compiler, execution, files, store, rollout, feature-flag)
- API: `apps/web/src/app/api/startup-os/**`
- UI: `apps/web/src/components/startup-os/startup-command-center.tsx` (~1800 lines), page `app/[locale]/(app)/startup-os/page.tsx`
- Data: `AtelierCanvas` (JSON scene blob) + `AgentRolloutLine` (ledger), Prisma schema
- AI: `executeStartupRun` → `invokeRealStartupRunModel` → `@nebutra/agents runWithFallback` → `ai` SDK
- Gate: `isStartupOSPrototypeEnabled()` (NODE_ENV≠production OR `STARTUP_AGENT_OS_PROTOTYPE=1`)
