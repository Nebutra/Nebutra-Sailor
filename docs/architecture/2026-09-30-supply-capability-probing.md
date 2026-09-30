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

## Deploy / ops

No owner-issued token is required for the schedule itself (`SERVICE_SECRET` is already shared).
One credential caveat: the two **built-in** sources (`cliproxyapi`, `newapi-channel-cliproxyapi`)
resolve `CLIPROXY_API_KEY` / `CLIPROXY_MANAGEMENT_KEY` / `NEW_API_ROOT_PASSWORD` from `process.env`
— today those are Router-Machine-only secrets. The Inngest schedule runs *inside the gateway
process*, but it reaches Router over HTTP (§4), so it needs none of them; only calling
`runDiscovery` / `runActiveProbes` directly from a *different* process than Router's own would need
them. A source added through the admin "add source" flow needs no such carve-out — its credential is
vault-encrypted and stored on the row itself. First deploy: run `db:deploy` (as every deploy already
does), then either wait for the next `03:00`/`03:30` UTC discovery+verification window or call
`discovery.run` / `probe.idle` once by hand through the admin desk to seed the registry immediately.
