# Design — unified supply behind router.nebutra.com/v1

## 1. Topology

```text
customer ──(sk-nebutra key)──▶ apps/router  /api/v1/[...path]   (product edge, public)
                                   │  validate key → wallet/policy → alias → forward
                                   ▼  (NEW_API_ACCESS_TOKEN, private network)
                              New-API  (channel hub, scheduling, retries, health)
                                   ├── channel: 302.ai / official keys      (A / C class)
                                   └── channel: http://cliproxyapi:8317/v1  (B class)
                                                  ▲ OpenAI-type channel, api-key from CLIProxyAPI config
                                            CLIProxyAPI (Gemini CLI / Antigravity / Codex / Claude accounts)
                                                  └── /data/auths/*.json on a volume
```

Decision: **CLIProxyAPI hangs under New-API, not beside it.** Router keeps a
single upstream (New-API) and inherits channel weighting, failover, and
per-channel usage without writing a scheduler. This matches design §5.7
("policy in shell; execution still via engines"). `SupplyEngineKind
"cliproxyapi"` stays for ops visibility, not as a second forward target.

## 2. Components and changes

### 2.1 `infra/nebutra-router`
- `compose.yaml`: add `cliproxyapi` service (image `eceasy/cli-proxy-api`,
  pin tag in `versions.lock`), `127.0.0.1:3003:8317`, volume `cliproxy_auths`
  → `/root/.cli-proxy-api`, config mounted from `config/cliproxyapi.yaml`
  (template committed, real file git-ignored). Keep `sub2api` profile as is.
- `compose.ecs.yaml`: same service for the ECS box.
- `infra/fly/cliproxyapi.toml`: private Machine, no public service, mount
  `cliproxy_auths`, region `sin`. Router/New-API reach it at
  `http://nebutra-cliproxyapi.internal:8317`.
- `scripts/cliproxy-login.sh`: wraps `cli-proxy-api --login <provider>
  --no-browser` inside the container, prints the URL, reads the pasted
  callback URL. Documented in README as the ops runbook.
- `scripts/seed-newapi-channel-cliproxy.py`: idempotent New-API admin API
  call that creates/updates the "cliproxyapi" channel (type OpenAI, base
  URL, key, model list from CLIProxyAPI `/v1/models`).

### 2.2 `apps/router/src/lib/openai-edge.ts`
- Credential: accept `Authorization: Bearer` **or** `x-api-key`.
- Validate against Nebutra key store (2.3). On success replace the outgoing
  `Authorization` with `Bearer ${NEW_API_ACCESS_TOKEN}`; never forward the
  customer key upstream.
- Header allow-list forwarded upstream: `content-type`, `accept`,
  `anthropic-version`, `anthropic-beta`, `openai-beta`, `x-stainless-*`.
- Path allow-list: `chat/completions`, `completions`, `responses`,
  `messages`, `messages/count_tokens`, `embeddings`, `images/*`, `models`,
  `audio/*`. Anything else → 404 `unknown_endpoint`.
- Usage: tee the response body; extract `usage` from JSON or final SSE
  chunk (reuse `@nebutra/gateway-core` stream usage extractor), emit a
  ledger event asynchronously with `{keyId, model, supplyPath, tokens}`.
  `supplyPath` comes from New-API's response header when present.

### 2.3 Key store (`apps/router/src/lib/keys.ts`, replaces demo-store for keys)
- Issue via `issueApiKey` from `@nebutra/prepaid-wallet`; persist
  `{id, tenantId, hash, prefix, scopes, revokedAt}` in the existing Prisma
  DB through the repository seam (`packages/platform/repositories`), which
  is required for quota/payments modules by CLAUDE.md.
- Lookup by SHA-256 hash; in-process LRU 60s to keep the edge fast; revoke
  clears the entry.
- Wallet stays `MemoryPrepaidWallet` for this task if the Prisma wallet is
  not ready; the ledger event contract is what matters. Flag in README.

### 2.4 Shelf (`packages/platform/router-supply`)
- `inventory.ts` already pulls New-API `/v1/models`; CLIProxyAPI models show
  up automatically once the channel exists. Add `supply` badge data
  (internal only) from channel tags for the ops view; the public `/models`
  stays class-blind.
- `NEBUTRA_MODEL_ALIASES` gets entries such as
  `gemini-3-pro → cliproxyapi:gemini-3-pro-preview`.

### 2.5 Docs (`apps/router` `/docs`)
- Tabs: OpenAI SDK · Anthropic SDK / Claude Code · Responses / Codex ·
  Images. Each tab: Base URL, key, env-var snippet, one call.

## 3. Data flow (one request)

1. Client → `POST /v1/messages`, `x-api-key: sk-…`.
2. Edge hashes key → store hit → tenant, scopes, not revoked; wallet
   balance > 0 else 402.
3. Alias map rewrites `model` in body only if the public id is an alias
   (body is streamed through untouched otherwise).
4. Forward to `NEW_API_BASE_URL/v1/messages` with internal token.
5. New-API picks channel (cliproxyapi or official) → response streamed back.
6. Tee extracts usage → ledger event → wallet debit.

## 4. Security

- Customer key never reaches New-API; New-API token never reaches customers.
- CLIProxyAPI management API disabled or bound to localhost; its `api-keys`
  entry is a random secret only New-API holds.
- OAuth JSON on a volume with `0600`; backup is an ops concern, documented.
- Rate limit per key at the edge (reuse gateway rate-limit middleware
  pattern) before hitting New-API.

## 5. Rollout / rollback

- Phase a: sidecar + channel + runbook (no customer-visible change).
- Phase b: edge header/credential changes behind `ROUTER_KEY_STORE=nebutra`
  env; default stays `newapi-token` until keys are migrated.
- Phase c: flip default, migrate `/keys` UI off demo store.
- Rollback: unset env → edge behaves exactly as today; remove channel in
  New-API → CLIProxyAPI traffic stops without touching Router.

## 6. Decisions (owner, 2026-09-08)

1. **Fly** is the production home. ECS compose stays for the lab box only.
2. First providers: **ChatGPT / Codex** and **Gemini (Google, via Antigravity
   login)** — community mainstream. Claude / Kimi / xAI later, same runbook.
3. **User ecosystem first.** Router keys are rows in the existing `APIKey`
   table (shared Prisma DB), scoped by the session's tenant, so one Nebutra
   account owns keys across `app` / `router` / gateway. No Router-only table.
   Access goes through a new `ApiKeyRepository` in `@nebutra/repositories`
   (existing package, repository seam). Key format stays `sk-sailor-…` from
   `@nebutra/prepaid-wallet`; the edge validates by hash so `nbk_live_…` keys
   issued in `apps/web` work too.

## 7. CLIProxyAPI facts (v7.2.154, 2026-09-07)

- Image `eceasy/cli-proxy-api`, port `8317`, config at
  `/CLIProxyAPI/config.yaml`, auth JSON at `/root/.cli-proxy-api`.
- Login flags: `-codex-login` (browser) / `-codex-device-login` (headless,
  preferred on a server), `-antigravity-login` (Google, callback :51121),
  `-claude-login`, `-kimi-login`, `-xai-login`; `-no-browser` prints the URL.
- Exposes OpenAI `/v1/chat/completions`, `/v1/responses`, Anthropic
  `/v1/messages`, Gemini native.
- `remote-management` stays off; `api-keys` holds one random secret that only
  New-API knows.

## 8. Supply desk in the control plane (owner request, 2026-09-08)

The owner will not run CLI logins. Entry is a web link:
`admin.nebutra.com` (Cloudflare Access + PlatformStaff) → `/supply` →
**打开号池管理台** → CLIProxyAPI's bundled management UI (`/management.html`).

- `apps/admin` proxies `/management.html`, `/v0/management/*`, `/oauth-callback`
  to `http://nebutra-cliproxyapi.internal:8317` over 6PN and injects
  `CLIPROXY_MANAGEMENT_KEY`. Engines keep no public ingress; staff hold no
  engine secret. Gate: `requireStaff()`.
- `POST /api/supply/sync-channel` upserts the New-API channel from the live
  `/v1/models` (TS port of the seed script), so "log in → press 同步" is the
  whole ops loop. Read-only staff cannot sync.
- Secrets are generated once and stored as repo secrets
  (`CLIPROXY_API_KEY`, `CLIPROXY_MANAGEMENT_KEY`, `NEW_API_ROOT_PASSWORD`);
  the deploy workflow renders the engine config and hands the control plane
  its copies via `flyctl secrets set -a nebutra-admin`.
- Found and fixed in passing: `nebutra-router` on Fly had
  `NEW_API_BASE_URL=http://127.0.0.1:3301/v1` (ECS leftover) — must be
  `http://nebutra-new-api.internal:3000/v1`.
