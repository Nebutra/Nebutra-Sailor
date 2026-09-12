# Router: unify key-based and account-based supply behind router.nebutra.com/v1

## Goal

Productize Nebutra Router so **any Nebutra-owned provider credential** —
an official API key (New-API channel) **or** an OAuth / CLI-login account
(CLIProxyAPI) — is sold through **one Base URL and one Nebutra-issued key**:

```text
Base URL = https://router.nebutra.com/v1
API Key  = sk-… issued by Nebutra
```

Reference products: New-API (key relay + shelf), CLIProxyAPI (account
reverse-proxy login flow), Crosery console (the combination, as seen at
console.ai.crosery.com). We copy the *product shape*, not the code.

## Background (as-is, 2026-09-08)

- New-API `v0.8.7.4` is already the pinned supply engine
  (`infra/nebutra-router`, private Fly Machine `nebutra-new-api.internal`,
  ECS `127.0.0.1:3301`). Only a 302.ai channel is configured.
- `apps/router` `/api/v1/[...path]` is a transparent forward to New-API;
  a "router key" today **is** a New-API user token.
- CLIProxyAPI is absent. Design doc
  `docs/plans/2026-07-23-nebutra-router-forge-design.md` §5.3 already
  schedules it as the Phase 2 B-class engine; `SupplyEngineKind` already
  has `"cliproxyapi"`.
- `/keys` and `/wallet` in `apps/router` run on an in-memory demo store.
  Keys created there are not honoured by the `/v1` edge.
- The edge forwards only `Authorization` + `Content-Type`; Anthropic-format
  clients (`x-api-key`, `anthropic-version`) are rejected with 401.

## Requirements

### R1 — Account-based supply (CLIProxyAPI sidecar)
- CLIProxyAPI runs as a pinned, private-network sidecar next to New-API
  (compose service + `versions.lock` + Fly private Machine). No public DNS.
- Auth material (OAuth JSON) lives on a persistent volume, never in git.
- Ops can add an account without a browser on the server: no-browser
  login URL → paste callback URL, or copy auth JSON into the volume.
- CLIProxyAPI is registered in New-API as an OpenAI-type channel so it is
  scheduled, weighted, and health-checked like any other channel.

### R2 — One key, every protocol
- One Nebutra key works for OpenAI chat/completions (stream + non-stream),
  OpenAI Responses, Anthropic `/v1/messages`, images, and `/v1/models`.
- `x-api-key` and `Authorization: Bearer` are accepted as the same credential.
- `anthropic-version`, `anthropic-beta`, `openai-*` request headers pass
  through; upstream `content-encoding` handling stays as today.

### R3 — Nebutra-issued keys are real
- Keys shown in `/keys` are issued and stored by Nebutra (prepaid-wallet
  `issueApiKey`), backed by a durable store, and are what the `/v1` edge
  validates. The New-API user token becomes an internal secret
  (`NEW_API_ACCESS_TOKEN`), never shown to customers.
- Revoke works immediately at the edge.

### R4 — Shelf reflects both supplies
- `/v1/models` and `/models` list models served by either supply; the
  customer cannot tell A/B/C class apart by default (design §5.2).
- Alias table maps public ids → engine/channel model ids.

### R5 — Usage and ledger
- Every `/v1` request records tokens + model + supply path to the Nebutra
  ledger (existing `@nebutra/metering` / prepaid-wallet contract), so the
  customer balance is Nebutra's, not New-API's.

### R6 — Docs and onboarding
- `/docs` shows three-minute quickstarts: OpenAI SDK, Anthropic SDK / Claude
  Code, Codex / Responses, image generation. Same shape as Crosery docs.

## Constraints

- Closure phase (`docs/architecture/2026-08-27-closure-phase.md`): no new
  workspace package, no new product noun. Everything lands in `apps/router`,
  `packages/platform/router-supply`, `packages/platform/prepaid-wallet`,
  `infra/nebutra-router`, `infra/fly`.
- Engines are pulled images, never vendored (design §5.3).
- Engine admin UIs are ops-only, never customer-facing.
- Secrets: channel keys and OAuth material never leave the private network.

## Non-goals

- Customer-selectable supply class / groups.
- Replacing New-API scheduling with our own.
- Public exposure of CLIProxyAPI's own management UI.

## Acceptance Criteria

- [ ] `docker compose up` in `infra/nebutra-router` brings up New-API + CLIProxyAPI; CLIProxyAPI appears as a healthy channel in New-API.
- [ ] Ops runbook: add a Gemini CLI / Antigravity / Codex / Claude account to the server without a browser on it; account survives container restart.
- [ ] One Nebutra `sk-…` key: `curl` succeeds for `POST /v1/chat/completions` (stream), `POST /v1/responses`, `POST /v1/messages` with `x-api-key`, `GET /v1/models`, against `router.nebutra.com`.
- [ ] Revoking the key in `/keys` makes the next `/v1` call return 401.
- [ ] `GET /v1/models` includes at least one model that is only served through CLIProxyAPI.
- [ ] Ledger row written per request with supply path; wallet balance decreases.
- [ ] `apps/router` tests cover header pass-through, key validation, and revoke; `infra/nebutra-router/scripts/smoke-chat.sh` extended for `/v1/messages`.
- [ ] `/docs` quickstarts render for OpenAI, Anthropic, Responses, images.
