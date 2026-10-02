# Supply capability probing — dynamic, self-maintaining supply

- **Date:** 2026-09-30
- **Status:** Accepted (core implemented; two gaps stated explicitly, see §7)
- **Owner:** Tseka Luk
- **Related:** ADR 2026-09-24 Sailor convergence (one provider per domain), ADR 2026-06-04
  production runtime closure (deploy targets), `packages/platform/router-supply`,
  `apps/router/src/lib/supply/*`

## Context — the incident (2026-09-30, verified live)

New-API channel #2 `cliproxyapi` (CLIProxyAPI, one Codex account) advertised
`gpt-image-2.5` / `-flare` / `-sunburst`. Every real call failed:

```
503 auth_not_found: no auth available (providers=codex, model=gpt-image-2.5)
```

Channel #1 `302-image2` served `gpt-image-2` with a revoked key (401). Router's public shelf
(`/api/catalogue`) still sold `gpt-image-2.5-flare` / `-sunburst`. Nobody noticed, because the
model lists behind both the shelf and the channels were hand-maintained: a channel's `models` CSV
is what an admin (or `channel.sync`) last wrote onto it, and the shelf's `sellable` flag
(`listing-catalog.ts` → `inventoryHas`) only proves an upstream's `/v1/models` *lists* an id — never
that a real call against it succeeds.

## Decision

Build a supply capability registry that is **discovered, verified, and self-healing** — no
hand-maintained model list anywhere in the path from "a source exists" to "the shelf sells it."

### 1. Discovery — `packages/platform/router-supply/src/discovery.ts`

One interface, `discover(source) → { protocol, models: [{ id, modality, capabilities?,
upstreamPrice? }] }`, pure and DB-free (no Prisma, no vault — this package is imported by
client-safe code elsewhere in Router, see `listing-catalog.ts`'s own doc comment on why a Prisma
import there broke the build). Adapters shipped:

| Adapter | Shape | Notes |
|---|---|---|
| `discoverOpenAiCompatible` | `GET {base}/v1/models` | The shape every relay/中转站, CLIProxyAPI and New-API's customer surface speak. Also `detectProtocol`'s first, cheapest try. |
| `discoverCliProxyApi` | `/v1/models` + optional `/v0/management/auth-files` | When a management key is given, cross-references the account pool: a model whose provider (codex/anthropic/antigravity, guessed from id shape) has zero healthy accounts is annotated `authAvailable: false` **at discovery time** — this is the incident's root cause, read directly rather than waited for. |
| `discoverNewApiChannel` | New-API admin session → `channel.models` CSV | Reuses the exact plumbing `apps/router/src/lib/supply/domain.ts`'s `computeChannelDiff` already has (`newApiLogin` / `newApiFindChannel`) — a channel's *advertised* list, injected via a small `NewApiSessionClient` interface so the DB-free package never touches `NEW_API_ROOT_PASSWORD`. |
| `discoverFalAi` | operator-declared `knownModelIds` | **Gap, stated in the adapter's own doc comment**: Fal.ai has no documented model-enumeration endpoint — each model is its own queue endpoint. This adapter turns operator-declared ids into tracked models (probing/state/shelf gating all work identically), so it does not *invent* discovery, but it cannot notice a model Fal added that nobody typed in. |

`detectProtocol(baseUrl, key)` tries OpenAI-compatible → CLIProxyAPI management → New-API login, in
that order (cheapest, most common first), for the admin "add source" flow.

### 2. Verification — `packages/platform/router-supply/src/verify.ts`

One real call per modality, the cheapest that still proves the path: text →
`max_tokens: 1` chat completion; image → `size: 256x256, quality: low`; embeddings → one short
input (audio/video default to the text shape — no cheaper audio/video probe is documented widely
enough to standardize on one, stated as a narrower gap than Fal's). `classifyFailure(status, body)`
maps a failure to one reason: `auth_not_found` (matches the incident's exact string first, before
falling back to status-code inference), `unauthorized`, `model_not_found`, `rate_limited`,
`timeout`, `server_error`, `unknown`. `rate_limited` is **neutral** — never counted as a failure by
the state machine (a 429 says the source is busy, not broken).

**Passive signal**: the real relay path (`apps/router/src/lib/openai-edge.ts`) already knows,
per request, which upstream channel served it (`x-oneapi-channel` / `x-newapi-channel`) and whether
it succeeded. `recordPassiveSignal` (`apps/router/src/lib/supply/capability.ts`) turns that into
free health data — same `recordProbe` write path as an active probe, `kind: PASSIVE_SIGNAL` instead
of `ACTIVE_PROBE` — fire-and-forget, never blocking or failing a customer's request. Active
verification then only needs to cover *idle* models (§4).

### 3. State machine — `packages/platform/router-supply/src/state.ts`

`PENDING → AVAILABLE → DEGRADED → SUSPENDED(temporary) → AVAILABLE`, pure and unit-tested without a
database (`state.test.ts`). Hysteresis: 1 failure degrades (still sellable, flagged), 3 consecutive
failures suspend (delist) — chosen so one flaky call cannot flap the public catalogue. Restoration:
1 consecutive success restores, immediately — the owner's explicit ask was "comes back by itself",
not "after a quorum," and a false-positive recovery only costs one more probe cycle since the
availability gate is additive on top of the existing published-price gate anyway. Backoff while
suspended: 1h → 6h → 24h, capped, **retried forever, never abandoned** — `nextBackoffSeconds` only
ever climbs to the ceiling, it never stops scheduling a next try. A row is **never deleted**;
`vanishedAt` (discovery) and `SUSPENDED` (verification) are both holds, not verdicts. Manual
override (`pinned` / `banned`) is the escape hatch, applied on top of the machine
(`effectiveState`) — not the delisting mechanism itself.

**Shelf gate**: a public model is sellable when *any* backing source-model resolves to
`AVAILABLE`/`DEGRADED` (`RouterSupplyRepository.availabilityFor`, one query for a whole candidate
list). A public model absent from the map (not yet discovered) is left alone by the gate — it
**fails open**, so rollout never blocks a model the existing inventory check already allows; the
gate only ever *removes* sellability it can prove is false. Discovery defaults a new row's
`publicModel` to the bare upstream id (`bareModelId`), matching the alias table's own 1:1 default
convention (`router-supply/alias.ts` `buildDefaultAliases`) — this is what lets an *existing*,
already-priced model (like `gpt-image-2.5-flare`) get gated immediately, without a manual mapping
step. **Newly discovered, not-yet-priced models** are handled by the *existing* mechanism, unchanged:
`model_configs.published` already gates the shelf (`shelf-prices.ts`), so a model with no price row
is unsellable regardless of supply state — "hold for pricing" needed no new code, only this ADR
saying so explicitly.

### 4. Scheduling — Inngest (`backends/gateway/src/inngest`)

**Why Inngest, not a new Router-owned cron**: Router already has a cron-scheduled background job for
its own domain — `routerReservationSweep` (`backends/gateway/src/inngest/functions/
routerReservationSweep.ts`), a `getSystemDb()` + repository + `step.run` job on a `cron` trigger,
registered in `backends/gateway/src/inngest/index.ts`. That is "the scheduler Router supply jobs
already use," so the three new schedules follow it exactly rather than inventing a second mechanism
(QStash is used elsewhere for queues, not cron; Router itself has never run its own cron).

| Function | Cron | Does |
|---|---|---|
| `supplyDiscovery` | `0 3 * * *` (daily) | Discovery diff, every enabled source. |
| `supplyIdleVerification` | `30 3 * * *` (daily) | Active probe for AVAILABLE/DEGRADED models unprobed in 24h. |
| `supplySuspendedRetry` | `15 * * * *` (hourly) | Retry SUSPENDED models whose backoff elapsed — the row-level backoff is the real rate limiter, not the hourly tick; most ticks find nothing due. |

**Event-driven triggers** ("source added / credential changed → full probe now") are handled
**synchronously in the admin action itself** (`addSource` / `probeSourceNow` in `capability.ts`),
not round-tripped through Inngest — an operator is waiting on the result of "add source," so it
runs inline rather than being told to come back later for something this cheap.

**Why the Inngest functions call Router over HTTP rather than re-running discovery in the gateway
process** (`backends/gateway/src/inngest/functions/lib/supply-admin-client.ts`): the
discovery/verification/state-machine logic has exactly one implementation
(`@nebutra/router-supply` + `RouterSupplyRepository`); what is *not* shared is
`apps/router/src/lib/supply/capability.ts`'s credential wiring (CLIProxyAPI's and New-API's
Fly-internal hosts and keys, held only by Router's own Machine) and its `Request`-scoped audit
logging. Next.js app code is not an importable package across app boundaries, so the choice is
duplicate the wiring or call the one process that already has it — this calls it, over the exact
`SERVICE_SECRET`-signed service-token relay the gateway already uses for its AI-gateway Router
upstream (`backends/gateway/src/routes/ai/gateway.ts` `routerUpstream`). **Zero new secrets**:
`SERVICE_SECRET` is already present on both Fly apps (and drift-guarded by the CI check that landed
immediately before this ADR).

### 5. Persistence — `packages/platform/db/prisma/schema.prisma`

Three new models, all `/// @rls deny` (admin/system only — a supply source and its capability state
are platform inventory, not tenant data; same posture as `PlatformStaff` / `StudioPreset`):

- **`SupplySource`** — one discovered/registered source: `key` (unique), `kind`
  (`OPENAI_COMPATIBLE | NEWAPI_CHANNEL | CLIPROXYAPI | FAL_AI`), `protocol` (from `detectProtocol`),
  `baseUrl`, `credentialRef` (an `@nebutra/vault` `encryptJSON` envelope, JSON-stringified — **never
  a plaintext key**; `null` for the two built-in sources, whose credentials stay env-held exactly as
  they are today).
- **`SupplySourceModel`** — one (source, upstream model) row: `state`, `stateReason`,
  `consecutiveFailures/Successes`, `backoffSeconds`, `nextProbeAt`, `pinned`/`banned`, `publicModel`,
  `capabilities`/`upstreamPrice` (JSON, adapter-shaped), `discoveredAt`/`vanishedAt`. Never deleted.
- **`SupplyProbeEvent`** — append-only: every discovery diff, active probe, passive signal and state
  transition, with `fromState`/`toState`/`reason`/`latencyMs`.

Migration `20260930140000_supply_capability_probing` is structure-only (generated via `prisma
migrate diff` against the running preview database, since `prisma migrate dev`'s shadow-database
step does not work against PGlite — see `packages/platform/db/README.md`'s "no database to set up"
section for why a temporary schema swap onto the already-migrated preview DB was needed to produce
it cleanly). `pnpm db:generate` regenerated `generated/rls.sql`; `node scripts/lint-database.mjs`
passes.

Repository seam: `RouterSupplyRepository` (`packages/platform/repositories`), mirroring
`RouterBillingRepository`'s role for the money spine — one database access point, tested against a
real Prisma client over PGlite (`router-supply.repository.test.ts`), including a scenario test that
reproduces the incident end to end (discovery → 3× `auth_not_found` → suspended → off the shelf →
one success → restored, four events, in order).

### 6. Shelf and relay wiring

- **Shelf** (`apps/router/src/lib/shelf-prices.ts` `applyPublishedPrices`): `sellable` is now
  `existingSellable && (availability.get(publicModel)?.sellable ?? true)` — additive, fails open on
  missing data, tested in `shelf-prices.test.ts`.
- **Relay path** (`apps/router/src/lib/billing-edge.ts` `admit`): one query
  (`availabilityFor(candidateModels)`) alongside the existing per-model price lookup; a candidate
  whose only backing source is suspended is dropped from the priced set. If every candidate is
  suspended, the edge now refuses with a new, precise code — **`model_unavailable`, HTTP 503** —
  instead of relaying into the same upstream failure this system exists to catch. The gate is
  **dependency-injected** (`RouterSupplyAvailability`, defaulting to a no-op that reads as
  "everything sellable"), so every existing `admit` test stays hermetic without needing to know this
  gate exists; the two production route handlers (`api/v1/[...path]/route.ts`,
  `api/console/v1/chat/route.ts`) wire the real, repository-backed one explicitly.

### 7. Admin visibility — the Router admin/supply desk

Two new resources on the existing `supply` domain (`apps/router/src/lib/admin/manifest.ts`):
`source` (list, `source.add`, `source.probe`) and `capability` (searchable list: public model,
source, state, reason, last probe, next retry). One new signal, `supply.suspended` — any sold
public model with a currently-suspended backing source. Three new actions besides `source.add` /
`source.probe`: `discovery.run`, `probe.idle`, `probe.suspended` — the same handlers the Inngest
schedule calls, exposed for an on-demand run.

**Stated gap, not faked**: `addSource` with `kind: NEWAPI_CHANNEL` registers *tracking* of an
existing New-API channel's advertised model list — it does not create the channel in New-API
itself. Channel creation already has a real, working implementation (`applyChannelSync` in
`domain.ts`, driven by the pre-existing `channel.sync` action); wiring `addSource` to call that
instead of asking the operator to create the channel by hand first is stated here as follow-up work,
not implemented, because doing it well means reconciling two "create or update a channel" code paths
into one and that reconciliation deserves its own review rather than a rushed merge under this ADR.

## What is live-ready vs. gapped

| Piece | State |
|---|---|
| Discovery adapters (OpenAI-compatible, CLIProxyAPI, New-API channel) | Real, tested against mocked HTTP |
| Fal.ai adapter | Real for tracking/probing; enumeration is operator-declared (documented API gap) |
| Verification probes + failure classification | Real, reproduces the incident's exact error string |
| State machine (hysteresis, backoff, manual override) | Real, pure, unit-tested |
| Persistence + repository | Real, migrated, RLS-correct, tested against real Prisma/PGlite |
| Shelf gate | Real, wired, tested |
| Relay-path gate (`model_unavailable`) | Real, wired, tested |
| Passive signal from real traffic | Real, best-effort, keyed off the New-API channel-name header |
| Admin desk (sources, capabilities, signal, on-demand actions) | Real, wired into the existing manifest |
| Scheduling (daily discovery, daily idle verification, hourly suspended retry) | Real, via the gateway's existing Inngest scheduler, calling Router over the existing service-token relay |
| New-API channel auto-*creation* via its admin API | **Not implemented** — stated gap above |
| Router-Machine-only credential access from the gateway process | **Deploy step required** — see report |

## Addendum (2026-09-30) — quota layer

Capability probing (above) answers "does this source work at all." It says nothing about
"how much of it is left" — an OpenCode Go account throttles at its 5h/weekly/monthly dollar
caps, a Command Code GOAT account at $14/5h · $35/7d · $70/month, a CLIProxyAPI-fronted
Codex/ChatGPT account has its own 5h/weekly usage windows, a New-API channel has a balance,
and a plain API key has per-key RPM/TPM. None of that is capacity failure — every one of
these sources answers real calls right up to the cap — so it needs its own state, separate
from `SupplyModelState`, and its own signal.

### 1. Signals — cheapest first

**(a) Passive header parsing** — `packages/platform/router-supply/src/quota-headers.ts`, pure,
no I/O. `parseOpenAiRateLimitHeaders` reads `x-ratelimit-{limit,remaining}-{requests,tokens}`
and OpenAI's own duration-string reset format (`6m0s`, `1s`, `250ms` — `parseOpenAiResetDuration`);
`parseAnthropicRateLimitHeaders` reads `anthropic-ratelimit-{requests,input-tokens,output-tokens,
tokens}-{limit,remaining,reset}` (RFC3339 timestamps, no duration parsing needed);
`parseRetryAfter` reads `retry-after` in both its delta-seconds and HTTP-date forms. A 429 with
*no* ratelimit headers at all (many plain relay APIs only ever send `retry-after`) still yields
a signal — `forceExhaustedUntil` — because "blocked until a timestamp" needs no limit/used ratio
to be actionable. Wired into the existing passive-signal hook: `apps/router/src/lib/openai-edge.ts`
now calls `recordQuotaHeaderSignal` (`apps/router/src/lib/supply/quota.ts`) from the same `finish`
closure that already calls `recordPassiveSignal`, same fire-and-forget posture, same `supplyPath`
key.

**(b) Active `usage(source)` per adapter** — `packages/platform/router-supply/src/quota-adapters.ts`:

| Adapter | Reads | Reports |
|---|---|---|
| `fetchCliProxyUsage` | `/v0/management/auth-files` (the same endpoint `discoverCliProxyApi` already reads) | Per-provider (codex/anthropic/antigravity) aggregate: `recentRequests` summed across that provider's accounts, and `resetsAt` taken from the soonest `next_retry_after` among them. **Stated gap**: the `quota` field CLIProxyAPI returns per account has no documented schema in this codebase (typed `unknown` in `clients.ts` today); the adapter duck-types a handful of common shapes (`{used,limit,resetAt}`, `{limit,remaining}`) and falls through to reporting only `recentRequests`/`resetsAt` (no ratio) when none match — real, not invented, but it cannot promise a 5h/weekly *ratio* until CLIProxyAPI's management API is confirmed to expose one. |
| `fetchNewApiChannelUsage` | `GET /api/channel/:id` over the existing `NewApiSessionClient` session (same `newApiLogin`/session plumbing `discoverNewApiChannel` already uses) | `used_quota`, converted to USD only when the operator has configured `quotaPerUnitUsd` (New-API's own quota-per-dollar ratio is an install-time setting this codebase has never had to read before now). **Stated gap**: no limit is reported — New-API channels do not carry one; a limit comes from the source's own declared `planConfig`, merged in at the repository layer, same as self-metering. |
| `fetchOpenAiCompatibleBalance` | An operator-declared `balanceEndpoint` + `balanceShape` (`openai_credit_grants` \| `generic_available_used`) | The two balance/credit shapes actually observed across OpenAI-compatible relays (`/dashboard/billing/credit_grants`-style, and the generic `{total_available, total_used}` shape several 中转站 clones use). **Stated gap**: there is no standard for this across providers, unlike `/v1/models`; a source with neither shape gets no active balance signal and falls back to (c). |

**(c) Self-metering** — for a source with no usable endpoint (GOAT, OpenCode Go, and any
CLIProxyAPI/New-API source without (b)'s specific fields populated): `SupplySource.planConfig`
(JSON, editable in admin) declares one or more named windows — `{ name, unit, limitAmount,
windowSeconds }`, e.g. GOAT's `[{name:"5h",unit:"USD",limitAmount:14,windowSeconds:18000},
{name:"7d",...,limitAmount:35,windowSeconds:604800},{name:"30d",...,limitAmount:70,
windowSeconds:2592000}]`. Every relayed request settled through that source
(`apps/router/src/lib/billing-edge.ts` `settle()`, keyed by the same `supplyPath` passive
signals already use) increments the `usedAmount` of every self-metered window on that source by
the request's real settled cost/tokens — no endpoint required, because we are the one paying the
bill.

### 2. Model — `SupplyQuotaWindow` + `SupplyQuotaSample`

Two new tables, both `/// @rls deny` (same posture as `SupplySourceModel`/`SupplyProbeEvent` —
platform inventory, not tenant data):

- **`SupplyQuotaWindow`** — one row per `(sourceId, name)`: `unit` (`USD|TOKENS|REQUESTS`),
  `limitAmount` (nullable — a source with no declared/observed limit still gets a row, it just
  never throttles), `usedAmount`, `resetsAt`, `windowSeconds`, `sourceOfTruth`
  (`HEADER|ENDPOINT|SELF_METERED`), `state` (`NOMINAL|THROTTLED|EXHAUSTED` — see §3),
  `burnRatePerHour`, `forecastExhaustAt`, `lastAlertLevel` (`NONE|WARN_80|WARN_95|EXHAUSTED`,
  monotonic within a window cycle, for dedupe), `lastAlertAt`, `lastForecastAlertAt`,
  `nextPullAt`/`pullIntervalSeconds` (adaptive scheduling, §6). Never deleted — a window rolls
  over, it does not reset its identity.
- **`SupplyQuotaSample`** — append-only, one row per observation applied to a window: `usedAmount`,
  `limitAmount`, `deltaAmount`, `sourceOfTruth`, `at`. History for the admin desk's burn-rate
  trend; the current-state fields on `SupplyQuotaWindow` are a materialized view of "the latest
  sample plus the pure reducer," not a separate source of truth.

`SupplySource.planConfig Json?` is the third schema change — the declared-plan input to (c),
editable through a new admin action (§5).

The pure reducer, `packages/platform/router-supply/src/quota.ts`:

- `stateFor(used, limit)` — `NOMINAL` below 80%, `THROTTLED` from 80% up to (not including) 100%,
  `EXHAUSTED` at or above 100%. A `null`/`≤0` limit is always `NOMINAL` — a window with no known
  cap cannot be said to be low on it.
- `applyQuotaObservation(window, observation, now)` — one pure transition. `sourceOfTruth:
  "self_metered"` **accumulates** (`used += deltaUsed`, we own the clock, so it also rolls the
  window over itself once `now >= resetsAt`, fast-forwarding through any number of missed cycles
  for a window nobody ticked in a while). `sourceOfTruth: "header"|"endpoint"` **replaces** `used`
  with the provider's own absolute reading (or `limit - remaining`) — the provider is authoritative
  about its own counters, we never accumulate on top of a number it already gave us in full,
  and adopts the provider's own `resetsAt` when it names one. A `forceExhaustedUntil` (the
  header-less-429 case from §1a) short-circuits straight to `EXHAUSTED` until that instant, with
  no ratio math at all. **Recovery is automatic and needs no special case**: whenever a computed
  `used` is *lower* than the window's previous `used`, that is a rollover by definition, and the
  reducer clears `lastAlertLevel` back to `NONE` and `burnRatePerHour` to unset right there — the
  next observation starts a fresh baseline, the same way `RESTORE_AFTER_SUCCESSES` in `state.ts`
  needed no separate "un-suspend" code path.
- Burn rate is a simple exponentially-smoothed rate (70/30) between consecutive samples, in
  amount/hour; `forecastExhaustAt = now + (limit - used) / burnRatePerHour`, `null` whenever there
  is no limit or no positive burn rate to extrapolate from.
- `ratioAlertLevel(used, limit)` → `NONE|WARN_80|WARN_95|EXHAUSTED`, and `shouldAlertRatio(prior,
  next)` fires only on **escalation** (`RANK[next] > RANK[prior]`) — flat or improving never
  re-fires, matching the dedupe requirement without a separate dedupe table.
  `shouldAlertForecast(forecastSoon, lastForecastAlertAt, now, cooldownMs)` is the independent
  second alert axis (§4): a forecast can fire even below 80% if burn rate spikes, on its own
  cooldown rather than the ratio ladder.

### 3. Behaviour — headroom-aware routing, never full delisting

`RouterSupplyRepository.availabilityFor` (extended) now reports, per public model, not just
`sellable` but `headroom: "ok" | "throttled"` — `"throttled"` when every *sellable* backing
source for that model has at least one quota window in `THROTTLED`/`EXHAUSTED` state, `"ok"` when
at least one sellable source has no such window. `apps/router/src/lib/billing-edge.ts`'s `admit()`
uses this only to **reorder** the priced candidate list (headroom-`ok` candidates sort before
`throttled` ones — this only changes *failover order* among the customer's own `models[]` list),
never to drop a candidate: a throttled source is still sellable, `model_unavailable` (503) is
still reserved for `SUSPENDED` capability only, exactly the ADR's original "fails open, only ever
removes what it can prove" posture, extended rather than narrowed.

**Stated scope limit, not faked**: Router's actual upstream fan-out for one public model is the
2-engine alias chain in `resolve.ts` (`newapi`, `sub2api`), not one chain per `SupplySource` —
New-API's own channel weighting picks which physical channel serves a `newapi`-engine call, and
Router does not control that per-request. So "prefer another source with headroom" is real and
enforced at the granularity Router actually routes at — across the customer's explicit `models[]`
candidates — and is a signal (via the `capability` admin resource + `supply.quota_alert`) at finer
granularity than that; it is not a per-channel override inside New-API's own balancer. Closing that
gap means teaching Router to pick channels directly instead of deferring to New-API, which is a
larger change than this addendum's scope.

At 100%/429 (`EXHAUSTED`) or `THROTTLED`, the window's own `resetsAt` is when it is retried, not a
backoff ladder — a quota window's reset time is provider fact, not a guess the way capability's
backoff-after-failure is.

### 4. Alerting — Feishu/Slack, deduped per window

The repo's existing chat-notification path is `packages/platform/status`'s
`STATUS_FEISHU_WEBHOOK_URL` / `STATUS_SLACK_WEBHOOK_URL` posting (`notify.ts`) — used today for
status-page incidents. `@nebutra/notifications` was considered and rejected: it is the
tenant/customer-facing multi-channel product (`recipientId`, per-user channel preferences), the
wrong shape for an ops alert nobody in particular subscribes to. Router admin `signals` (existing
`supply.suspended`) were also considered: they are pull-based (the admin UI polls them), which is
right for visibility (§5) but is not itself a push. So `notify.ts` gains two small, generic
functions — `feishuOpsAlertPayload` / `slackOpsAlertPayload` / `notifyOpsAlert` — that build a
plain `{title, detail, severity, url}` card instead of a `StatusIncident`, reusing the same env
vars, the same `post()`/`feishuSign()` transport, with no dependency on the incident model. Supply
quota alerts call `notifyOpsAlert` directly; the status page's own incidents keep using
`notifyIncident` unchanged.

Dedupe is the reducer's job, not the alert path's: `shouldAlertRatio`/`shouldAlertForecast` (§2)
decide per window, per apply, whether this is a new escalation; the orchestration layer
(`apps/router/src/lib/supply/quota.ts`) only ever calls `notifyOpsAlert` when one of those returns
true, and persists the new `lastAlertLevel`/`lastForecastAlertAt` in the same write as the window
update — so a crash between "decided to alert" and "persisted that it alerted" is the only way to
double-fire, the same window every other best-effort write in this codebase accepts.

### 5. Admin — a `quota` resource on the existing supply desk

`apps/router/src/lib/admin/manifest.ts`: one resource, `quota` (`GET .../quota-windows`,
searchable, columns `source`, `name`, `unit`, `used`, `limit`, `state`, `burnRatePerHour`,
`forecastExhaustAt`, `resetsAt`, `sourceOfTruth`); one action, `source.plan.update` (edit a
source's `planConfig` — the declared windows self-metering tracks); one new signal,
`supply.quota_alert` (raised whenever any window is `THROTTLED`/`EXHAUSTED` or forecasting
exhaustion soon), read the same pull-based way `supply.suspended` already is. `probe.idle`'s
existing admin action is joined by `quota.pull` — an on-demand active-usage pull, the same handler
the adaptive schedule (§6) calls.

### 6. Scheduling — adaptive, Inngest

A fourth Inngest function, `supplyQuotaPull` (`backends/gateway/src/inngest/functions/
supplyQuotaPull.ts`), cron `*/15 * * * *` (every 15 minutes — the ceiling frequency), calling a new
`quota.pull` admin action over the same `callSupplyAction` relay the other three schedules use.
Unlike discovery/verification's fixed cadence, this one is adaptive **inside** the action, not in
the cron expression: `RouterSupplyRepository.listQuotaWindowsDueForPull(now)` filters to
`nextPullAt <= now`, and after every apply the orchestration sets the next `nextPullAt` from the
window's own headroom — close to a limit or actively burning pulls again in the next tick (as soon
as 15 minutes later, the cron's own floor), an idle or comfortably-under-80% window is pushed
30–60 minutes out, so most 15-minute ticks find few windows due, the same "row-level schedule, not
cron interval, is the real rate limiter" posture `listSuspendedDueForRetry` already established.
Self-metered windows are ticked on every pull too (with a zero-delta observation when nothing
new happened since the last real settle) purely so a self-metered window with no active traffic
still rolls over at `resetsAt` instead of staying artificially `EXHAUSTED` forever.

### What is live-ready vs. gapped (quota layer)

| Piece | State |
|---|---|
| Header parsing (OpenAI, Anthropic, Retry-After, header-less 429) | Real, unit-tested |
| Window math (rollover, burn rate, forecast, alert dedupe) | Real, pure, unit-tested |
| Self-metering from real settled traffic | Real, wired into `billing-edge.ts` `settle()` |
| CLIProxyAPI active usage | Real for `recentRequests`/`next_retry_after`; ratio data is a stated gap (undocumented `quota` field shape) |
| New-API channel active usage | Real for `used_quota`; requires an operator-set `quotaPerUnitUsd`, no limit (comes from `planConfig`) |
| Generic OpenAI-compatible balance | Real for the two shapes observed in the wild; no universal endpoint exists, stated gap for anything else |
| Persistence + repository | Real, migrated, RLS-correct, tested against real Prisma/PGlite |
| Headroom-aware candidate ordering | Real, wired, scoped to Router's actual 2-engine fan-out (stated limit, not per-channel) |
| Alerting (Feishu/Slack, deduped) | Real, reuses `packages/platform/status`'s existing webhook transport |
| Admin (`quota` resource, `source.plan.update`, `supply.quota_alert`) | Real, wired into the existing manifest |
| Scheduling (adaptive pull via Inngest) | Real, via the gateway's existing Inngest scheduler |

## Deploy / ops

No owner-issued token is required for the schedule itself (`SERVICE_SECRET` is already shared).
One credential caveat: the two **built-in** sources (`cliproxyapi`, `newapi-channel-cliproxyapi`)
resolve `CLIPROXY_API_KEY` / `CLIPROXY_MANAGEMENT_KEY` / `NEW_API_ROOT_PASSWORD` from `process.env`
— today those are Router-Machine-only secrets. The Inngest schedule runs *inside the gateway
process*, but it reaches Router over HTTP (§4), so it needs none of them; only calling
`runDiscovery` / `runActiveProbes` directly from a *different* process than Router's own would need
them. A source added through the admin "add source" flow needs no such carve-out — its credential is
vault-encrypted and stored on the row itself. First deploy: run `db:deploy` (as every deploy already
does); the registry then seeds itself on Router's first boot (§8's `supply/bootstrap`) rather than
waiting for the `03:00`/`03:30` UTC backstop or an operator calling `discovery.run` / `probe.idle` by
hand — though either still works as a manual nudge.

## Addendum (2026-10-02) — Event-driven execution

Both of the above (capability probing and the quota layer) scheduled their *maintenance* work —
discovery, idle/suspended verification, quota pulls — on Inngest cron, which this ADR already singled
out as the right mechanism (§4). What this addendum removes is the part that was never event-driven at
all: **every admin action that touched more than one model did its upstream work synchronously, inside
one HTTP request** — a design gap the owner identified (§8.0) as worth closing pre-emptively, which is
why the sections below exist.

### 8.0 The failure mode this closes (owner-identified, 2026-10-02 — not re-observed live)

`cliproxyapi`'s New-API channel carries 86 models. Before this addendum, an operator's "probe now"
(`source.probe`) ran `runDiscovery` (one call), then `probeRows` over **every** row for that source
**sequentially, inside the same HTTP request** — each a real upstream call with its own latency. For a
source that size, total wall time comfortably exceeds Cloudflare's ~100s origin timeout, which answers
with its own `524` page before Router's own response ever leaves the origin — the same shape as the
ADR's original §0 incident, one level up the stack (that one was a model nobody could reach; this one,
had it fired, would have been a response nobody could receive). The owner flagged this as a design gap
to close pre-emptively, not as a reproduced outage — stated here as "identified," not "verified live," to
keep that distinction honest. Two more gaps the owner named alongside it: **no event exists when a
source is added** — `addSource` persisted the row and ran one discovery call, but nothing then probed
the fresh models until the next `03:30` sweep, so the only way a newly added source's capability got
checked promptly was an operator manually triggering `source.probe` (the exact action that risks the 524
above); and **a newly deployed environment's registry sits empty** until that same `03:00` cron first
runs, so a fresh Fly Machine or a new preview deploy has zero supply visibility for hours.

### 8.1 Events

Five Inngest events, typed via Zod schemas in `@nebutra/event-bus` (`packages/integrations/event-bus/
src/schemas/inngest.ts`, the same package `stripe/*` and `nebutra/gdpr.*` already use) and consumed with
`eventType(name, { schema })` per trigger — the pattern `billingSync.ts` / `gdprDeletion.ts` already
established, not a new one:

| Event | Payload | Fired by |
|---|---|---|
| `supply/source.changed` | `{ sourceKey, reason: added\|credential_changed\|enabled\|scheduled }` | `addSource` (always); `triggerDiscoveryForAllSources` (per enabled source); `supplyBootstrap` (per built-in source) |
| `supply/model.discovered` | `{ sourceKey, upstreamModels }` | `addSource` and `supplySourceChanged`, for models a discovery diff found added or reappeared |
| `supply/model.signal` | `{ sourceKey, upstreamModel?, kind: error_spike\|rate_limited\|quota_threshold, reason? }` | `recordPassiveSignal` (error_spike, rate_limited) and `quota.ts`'s `fireAlerts` (quota_threshold) — see §8.4 |
| `supply/probe.requested` | `{ sourceKey?, upstreamModels?, runId }` | `probeSourceNow` (admin "probe now", no `upstreamModels` — fan-out discovers then probes everything current); `runActiveProbes` / `runSuspendedRetry` (grouped by source, `upstreamModels` already known); `supplyModelSignal` (one model, after debounce) |
| `supply/bootstrap` | `{ sourceKeys, triggeredAt }` | `maybeEmitBootstrap`, from Router's `instrumentation.ts`, at most once per process |

### 8.2 Router emits; it does not call Inngest

Router's own process has no `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` — only the gateway's env schema
names them (`backends/gateway/src/config/env.ts`), and Router's `.env.example` never has. Handing Router
a second Inngest key purely so it could call Inngest's HTTP API directly would be a new owner-set secret
for a capability the gateway already has. So `apps/router/src/lib/supply/events.ts`'s `emitSupplyEvent`
posts to a small new gateway endpoint instead — `backends/gateway/src/routes/internal/
supply-events.ts`'s `POST /api/internal/v1/supply/events` — which calls `inngest.send` on Router's
behalf and answers `202` with the event's id.

**Zero new secret, same primitive reused in both directions**: the request is authenticated with the
exact zero-context service token `apps/router/src/lib/internal-service.ts`'s
`verifyInternalServiceCaller` already mints/verifies for "Nebutra infrastructure calling itself"
(`signServiceToken({}, SERVICE_SECRET)`, `verifyServiceToken(token)` with no expected userId / role /
org / plan) — not the staff-ladder `x-user-id`/`x-role` shape `gateStaff` uses for admin actions, because
this is not an admin acting, it is Router's own process telling the gateway's own process something
happened. `backends/gateway/src/middlewares/rateLimitSkip.ts` and both architecture tests'
(`tests/architecture/api-contract.test.ts`, `tests/architecture/permissions-ratchet.test.ts`) exemption
lists treat this route the same way they already treat `/api/inngest` / `/api/queue`: process-to-process
infrastructure, not a versioned public business API, not a route with a tenant identity to require.

### 8.3 Router's admin actions: discover(source) and probe(source, model), not "probe everything"

The fix for §8.0's incident is splitting every action that used to loop over models into two primitives
that each do exactly one bounded unit of upstream work, plus orchestration that only ever lists + emits:

| Action (unchanged id unless noted) | Before | After |
|---|---|---|
| `source.discover` (new) | — | `discoverSourceByKey(sourceKey)` — one source's enumeration call, returns the diff, probes nothing |
| `probe.one` (new) | — | `probeOneModel(sourceKey, upstreamModel)` — exactly one upstream verification call |
| `source.add` | discovered, then returned | still discovers (one call, to report a count), but hands fresh models to `supply/model.discovered` instead of probing them inline; emits `supply/source.changed`; responds `202` |
| `source.probe` | discovery + probe every row, synchronously | emits `supply/probe.requested { sourceKey, runId }` and responds `202` immediately with `status: "queued"` |
| `discovery.run` | looped `discoverSource` over every enabled source | lists enabled sources (bounded by source count) and emits one `supply/source.changed` each — zero upstream calls in this request |
| `probe.idle` / `probe.suspended` | looped `probeRows` over up to 50/100 due rows | lists the due rows (one capped DB read), groups by source, emits one `supply/probe.requested` per source — zero upstream calls in this request |
| `probe.status` (new, `platform_readonly`) | — | `probeRunStatus(sourceKey, since)` — queued / running / done, from `SupplySourceModel.lastProbeAt` already in the DB; no new schema |

`backends/gateway/src/inngest/functions/supplyModelFanout.ts` is where the actual upstream calls now
happen, one `step.run` per model (triggered by `supply/model.discovered` or `supply/probe.requested`;
when the latter carries no `upstreamModels`, it first calls `source.discover` then
`GET /api/admin/v1/supply/capabilities` — the existing read-only resource, no new endpoint — to list the
current set). Each step is its own retryable unit with its own timeout, not a line in a loop sharing one
HTTP request's clock; an 86-model "probe now" is 86 independent steps, however long that takes in wall
time, not one request racing Cloudflare's 100s. Concurrency is capped per source
(`concurrency: [{ limit: 5, key: "event.data.sourceKey" }, { limit: 20 }]`) so one large source cannot
starve the fan-out worker pool, and consecutive image-modality probes get an extra `step.sleep` between
them — a stated, coarse throttle (it does not consult that source's own quota headroom, which the
existing `rate_limited`-is-neutral classification already protects against misreading as a failure), not
a per-source rate model.

`backends/gateway/src/inngest/functions/supplySourceChanged.ts` is the `supply/source.changed` handler:
one `source.discover` step, then (if the diff has anything new) one `step.sendEvent` of
`supply/model.discovered`. `backends/gateway/src/inngest/functions/supplyBootstrap.ts` turns one
`supply/bootstrap` into a `step.sendEvent` batch of `supply/source.changed`, one per named key — "boot‑
strap = source.changed for every built-in source," reusing the discovery pipeline rather than
duplicating it.

### 8.4 Targeted re-probes from passive signals, debounced

`recordPassiveSignal` (capability.ts) already classified a failure's reason; it now also emits
`supply/model.signal` when that classification is actionable: `kind: "rate_limited"` for a neutral 429
(worth a retry once the burst passes, even though it never touches the state machine), `kind:
"error_spike"` when a real failure's `recordProbe` transitions the row to `DEGRADED`/`SUSPENDED`. `quota.
ts`'s `fireAlerts` emits `kind: "quota_threshold"` alongside its existing `notifyOpsAlert` page whenever
a ratio-alert rung fires.

`backends/gateway/src/inngest/functions/supplyModelSignal.ts` is the consumer:
`debounce: { key: "event.data.sourceKey + '-' + (event.data.upstreamModel ?? 'source')", period: "2m",
timeout: "10m" }` — a burst of failing requests against the same model collapses into exactly one
re-probe, `period` after the *last* signal in the burst, with a hard `timeout` ceiling so a model that
never stops erroring still gets probed rather than having its debounce extended forever. `error_spike`
and `rate_limited` turn into a single-model `supply/probe.requested`; `quota_threshold` is deliberately a
no-op here — a quota crossing is not a capability problem, and the existing alert path already pages the
operator for it, so re-probing the model would waste a call against a source already known to be busy.

### 8.5 Bootstrap

`apps/router/src/lib/supply/capability.ts`'s `maybeEmitBootstrap`, called (not awaited) from `apps/
router/src/instrumentation.ts` on process start: checks whether the registry was empty before
`ensureDefaultSources()`, or whether any source (built-in or not) has never completed a discovery
(`lastDiscoveredAt === null`); if either is true, emits `supply/bootstrap` naming every such source and
remembers (module-scope flag) that this process already checked, so a long-lived Router instance does
not re-query on every request that happens to import the module. Not awaited in `instrumentation.ts`, so
a slow or unreachable gateway never delays Router's own boot — the same best-effort, fire-and-forget
posture every other emission in this system already has.

### 8.6 Admin run status

`probe.status` (platform_readonly) answers "is a queued 'probe now' done yet" by comparing a source's
current, non-vanished `SupplySourceModel` rows' `lastProbeAt` against the `since` timestamp the caller
supplies (normally the moment `source.probe` returned its `runId`): `"queued"` (none yet), `"running"`
(some), `"done"` (all, including the zero-models case). No new table — this reads exactly what the
`capability` admin resource already lists; `runId` itself is Router's own correlation id, threaded
through the event payload for operator-facing correlation, not Inngest's internal function-run id, which
`inngest.send()` does not return.

### What changed vs. gapped (event-driven execution)

| Piece | State |
|---|---|
| Typed `supply/*` events (`@nebutra/event-bus`) | Real, Zod-validated at the trigger |
| Router → gateway event relay (zero new secret) | Real, same zero-context token as the existing internal chat relay |
| `discover(source)` / `probe(source, model)` primitives | Real, each exactly one upstream call |
| Fan-out via Inngest steps, concurrency-capped per source | Real; image-probe spacing is a stated coarse throttle, not quota-aware |
| `source.add` / `source.probe` return `202` + `runId`, probe asynchronously | Real |
| `discovery.run` / `probe.idle` / `probe.suspended` narrowed to list + emit | Real; crons unchanged, now backstops in substance as well as name |
| Debounced targeted re-probe from passive signals | Real (`error_spike`, `rate_limited`); `quota_threshold` is informational-only, stated |
| Bootstrap on empty/unseeded registry | Real, fire-and-forget from Router's own `instrumentation.ts` |
| Admin run status (`probe.status`) | Real, reads existing columns, no new schema |
| New-API channel auto-*creation* via its admin API | Still **not implemented** — unchanged stated gap from §7 |
