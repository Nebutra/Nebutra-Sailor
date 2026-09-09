# Nebutra Router — supply engines

Version-pinned **sidecar** processes for model supply. They are **generators**, not the product.

| Service | Role | Local port |
|---------|------|------------|
| `new-api` | Channel hub (A/C supply) | `127.0.0.1:3001` |
| `cliproxyapi` | OAuth / CLI account relay (B) — ChatGPT-Codex, Google, Claude | `127.0.0.1:3003` |
| `sub2api` | Subscription pool (B) — optional profile | `127.0.0.1:3002` |
| `postgres` / `redis` | Engine deps | internal + optional host maps |

## Rules

1. **Do not** expose New-API / Sub2API admin UI to C-end customers.  
2. Customer keys and billing live on **Nebutra Router** control plane.  
3. Pin images in `versions.lock`; do not vendor engine source into the monorepo.  
4. Production: private network / mesh only; no public DNS for these ports.

## Quick start (dev)

```bash
cd infra/nebutra-router
docker compose up -d
# optional B-class:
# docker compose --profile sub2api up -d

# open New-API admin (ops only): http://127.0.0.1:3001
```

## Smoke

After root admin setup in New-API:

1. Add an official upstream API key channel.  
2. Create an internal token for the Nebutra adapter.  
3. Point Router adapter `baseUrl` at `http://127.0.0.1:3001` (or in-cluster DNS).

## 302.ai image2 channel (ops only)

The 302.ai key never leaves New-API. Public consume is `https://router.nebutra.com/v1`.

1. New-API admin (localhost / mesh only): add a channel  
   - Type: OpenAI  
   - Base: `https://api.302.ai`  
   - Key: the 302.ai secret  
   - Models: `gpt-image-2` (and any other sellable ids)
2. Create a **user token** for 观澜 / product consume. That token is the router API key.
3. Router PM2 env: `NEW_API_BASE_URL=http://127.0.0.1:3001/v1`  
   On the ECS box, landing already owns `:3001`. Bind New-API to a free
   localhost port (for example `127.0.0.1:3301:3000`) and point Router at
   that port. Do not publish New-API on a public hostname.
4. 观澜 backend env: `ROUTER_API_KEY=<that user token>`  
   `IMAGE2_BASE_URL=https://router.nebutra.com/v1`  
   `IMAGE2_MODEL=gpt-image-2`

Request shape is the 302.ai / OpenAI contract:

```text
POST /v1/images/edits
Authorization: Bearer <router key>
Content-Type: multipart/form-data
image + prompt + model=gpt-image-2 + size
```

## Account relay (CLIProxyAPI)

One Nebutra key sells both supplies. API-key channels and account channels
both sit inside New-API; CLIProxyAPI is **a channel, not a second upstream**.

```text
router.nebutra.com/v1 ─▶ New-API ─┬─ 302.ai / official keys      (A / C)
                                  └─ cliproxyapi:8317 (OpenAI type) (B)
                                        └─ /root/.cli-proxy-api/*.json  ← logged-in accounts
```

### First-time setup

```bash
cd infra/nebutra-router
cp config/cliproxyapi.yaml.template config/cliproxyapi.yaml
sed -i '' "s/replace-with-openssl-rand-hex-32/$(openssl rand -hex 32)/" config/cliproxyapi.yaml
docker compose up -d cliproxyapi
```

### Add an account — web (default)

1. Open `https://admin.nebutra.com/supply` (Cloudflare Access sign-in, platform staff only).
2. **打开号池管理台** → CLIProxyAPI's own management UI, proxied over 6PN with
   the management key injected. Choose the provider's OAuth login.
3. Codex: device code, done in the browser. Google / Claude: open the printed
   link on your laptop, approve, copy the `localhost:…` URL from the address
   bar and paste it back into the UI.

   That `localhost` address belongs to a listener on **your own machine**, not
   to CLIProxyAPI. The server completes the exchange through
   `POST /v0/management/oauth-callback`, which takes the pasted URL. Probing for
   management routes is misleading: every unmatched path under `/v0/management/`
   answers `401`, not `404`, because the auth middleware runs before the
   not-found handler.
4. Back on `/supply`, press **同步模型到 New-API 渠道**. Models are on the
   shelf at `router.nebutra.com/v1/models` within the inventory TTL.

### Add an account — CLI (fallback, no browser on the server)

```bash
scripts/cliproxy-login.sh codex     # ChatGPT / Codex — device code, fully headless
scripts/cliproxy-login.sh gemini    # Google — prints URL; approve on laptop; paste callback URL back
scripts/cliproxy-login.sh claude    # Claude Code — same paste-back flow
```

Google / Claude paste-back: the printed URL redirects your laptop browser to
`http://localhost:51121/oauth-callback?state=…&code=…`, which does not load.
Copy that URL from the address bar into the terminal. Codes are single-use
and expire in minutes, so never paste them into chat or tickets.

Production (Fly): `FLY_APP=nebutra-cliproxyapi scripts/cliproxy-login.sh codex`.
Auth JSON is on the `cliproxy_auths` volume and survives redeploys.

### Secrets by Machine (after the admin contract)

| Machine | Secrets |
|---|---|
| `nebutra-router` | `SERVICE_SECRET`, `CLIPROXY_API_KEY`, `CLIPROXY_MANAGEMENT_KEY`, `NEW_API_ROOT_PASSWORD`, `NEW_API_ACCESS_TOKEN`, `NEW_API_BASE_URL` |
| `nebutra-admin` | `SERVICE_SECRET` (same value), `CLIPROXY_MANAGEMENT_KEY` (management-UI proxy only) |
| `nebutra-cliproxyapi` | rendered `config.yaml` (api-key + management secret) |

The channel sync now runs as a contract action on router (`channel.sync`,
plan → apply); the admin app only renders and audits.

### Register as a New-API channel

```bash
CLIPROXY_API_KEY=$(grep -A1 api-keys config/cliproxyapi.yaml | tail -1 | tr -d ' "-') \
NEW_API_ROOT_PASSWORD=… \
python3 scripts/seed-newapi-channel-cliproxy.py
```

Idempotent: re-run after adding accounts so the channel's model list follows
CLIProxyAPI `/v1/models`. Keep official-key channels at a higher priority;
account relay is capacity, not the compliance story.

On Fly the workflow `deploy-cliproxyapi-fly.yml` does all of the above except
the login, which is interactive by nature.

### Smoke the public edge

```bash
BASE=https://router.nebutra.com/v1 TOKEN=sk-sailor-… MODEL=gpt-5 scripts/smoke-chat.sh
```

Probes `/models`, `/chat/completions`, `/responses`, and `/messages` with
`x-api-key` — one key, every protocol.

## Price seed (`scripts/seed-model-prices.mts`)

The /v1 edge prices a request from `model_configs`, never from a live models.dev
call. This script fills that table from the shelf — the intersection of what the
sidecars can route and what models.dev knows the price of.

```bash
# from the repo root
pnpm exec tsx infra/nebutra-router/scripts/seed-model-prices.mts --dry-run
pnpm exec tsx infra/nebutra-router/scripts/seed-model-prices.mts
```

- **Idempotent** — upserts on `model_name`; re-running updates prices in place.
- **Never deletes** — a model that leaves the shelf is unpublished
  (`published = false`, `is_active = false`) so old ledger rows still join to a
  price.
- **Unpriced never publishes** — a model with no input/output price is written
  but held back, because an unpriced SKU must be refusable at the edge rather
  than relayed for free.
- Needs `DATABASE_URL`, plus whatever `NEW_API_*` / `NEBUTRA_MODEL_ALIASES` the
  shelf needs to see real inventory. Without them the shelf falls back to the
  alias table and the seed is correspondingly small — the dry run prints the
  shelf size and source first, so check that line before writing.
- `.mts` rather than `.ts`: the repo root is CommonJS, and the script needs ESM
  to import `@nebutra/db`.

## Related

- Design: `docs/plans/2026-07-23-nebutra-router-forge-design.md`  
- Impl plan: `docs/plans/2026-07-23-nebutra-router-forge-implementation-plan.md`
