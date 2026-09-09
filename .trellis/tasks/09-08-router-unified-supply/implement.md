# Implement — router unified supply

Order matters: infra first (no customer change), then seam, then edge, then UI.

## Step 1 — infra: CLIProxyAPI sidecar
- [x] `infra/nebutra-router/versions.lock`: add `cliproxyapi` (eceasy/cli-proxy-api v7.2.154, role account-relay)
- [x] `infra/nebutra-router/compose.yaml`: `cliproxyapi` service, `127.0.0.1:3003:8317`, volumes `cliproxy_auths`, config mount
- [x] `infra/nebutra-router/compose.ecs.yaml`: same, lab only
- [x] `infra/nebutra-router/config/cliproxyapi.yaml.template`
- [x] `infra/nebutra-router/scripts/cliproxy-login.sh` (codex device / antigravity no-browser)
- [x] `infra/nebutra-router/scripts/seed-newapi-channel-cliproxy.py` (idempotent channel upsert via New-API admin API)
- [x] `infra/nebutra-router/scripts/smoke-chat.sh`: add `/v1/messages` + `/v1/responses` probes
- [x] `infra/fly/cliproxyapi.toml` (private Machine, mount `cliproxy_auths`)
- [x] `.github/workflows/deploy-cliproxyapi-fly.yml`
- [x] `infra/nebutra-router/README.md`: runbook

## Step 2 — seam: `ApiKeyRepository`
- [x] `packages/platform/repositories/src/api-key.repository.ts`: `findActiveByHash`, `listByTenant`, `create`, `revoke`, `touchLastUsed`
- [x] export from index; unit test with a Prisma stub

## Step 3 — edge: one key, every protocol
- [x] `apps/router/src/lib/openai-edge.ts`: credential from `Authorization: Bearer` or `x-api-key`; path allow-list; header allow-list; optional `KeyResolver` → replace upstream auth with `NEW_API_ACCESS_TOKEN`; usage tee → `onUsage`
- [x] `apps/router/src/lib/router-keys.ts`: Prisma-backed resolver via `ApiKeyRepository` + 60 s LRU; `ROUTER_KEY_STORE=nebutra|newapi-token`
- [x] `apps/router/src/lib/usage-ledger.ts`: `onUsage` → `UsageLedgerRepository.claim` (idempotency = request id), AI_TOKEN
- [x] catch-all route wires resolver + ledger
- [x] tests: x-api-key accepted, headers forwarded, unknown path 404, revoked key 401, usage extracted from JSON and SSE

## Step 4 — console
- [x] `/api/v1/keys` GET/POST + `/api/v1/keys/[id]` DELETE against the repository, scoped by session tenant; demo store only when `ROUTER_KEY_STORE` unset and no DB
- [x] `keys-client.tsx`: revoke button
- [x] `/docs`: tabs OpenAI · Anthropic / Claude Code · Responses / Codex · Images

## Step 5 — verify
- [x] `pnpm --filter @nebutra/router test && typecheck`
- [x] `pnpm --filter @nebutra/repositories test && typecheck`
- [x] lint guards: repository-seam 0 new bypass, no-raw-inputs clean, biome clean on touched files (full `pnpm lint` not run)
- [x] `docker compose config` for both compose files (both pass)

## Not done in this pass (needs the owner or a live environment)
- Fly deploy of `nebutra-cliproxyapi` and the first `cliproxy-login.sh codex` / `gemini` on the volume
- Flipping `ROUTER_KEY_STORE=nebutra` + `NEW_API_ACCESS_TOKEN` on `nebutra-router`
- Live smoke of `/v1/messages` through the public edge
- Ledger → wallet debit (ledger rows are written; pricing/debit stays with the gateway completion worker)

## Step 6 — supply desk (owner: "give me a link, I click into the pool")
- [x] `apps/admin/src/lib/supply.ts`: proxy with key injection, model listing, New-API channel upsert, engine probes
- [x] routes: `/management.html`, `/v0/management/[...path]`, `/oauth-callback`, `POST /api/supply/sync-channel`
- [x] `/supply` page + Fleet link; sync button
- [x] template: `remote-management.allow-remote: true`, secret placeholder; workflow renders both keys, hands admin its secrets, tolerates empty pool
- [x] admin typecheck + tests (21) + biome
- [x] secrets set by owner via `!` lines; Fly router NEW_API_BASE_URL fixed; PR #545 merged; admin deployed (run 34180383969); CLIProxyAPI deployed + smoke green (run 34185198439); admin holds supply secrets
- [ ] New-API on Fly was never initialised (`/api/setup` root_init=false, 0 users). `scripts/new-api-setup.py` creates root with NEW_API_ROOT_PASSWORD over flyctl proxy — blocked for the agent, owner runs it. Then 同步 works.
