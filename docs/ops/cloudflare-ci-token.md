# Cloudflare CI API token (Nebutra-Sailor)

GitHub Actions secrets used by `deploy-sailor-docs.yml`, `deploy-typelens.yml`,
`deploy-gateway.yml`, and `point-*-dns.yml`:

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | Workers deploy, DNS scripts, optional KV |
| `CLOUDFLARE_ACCOUNT_ID` | Account `a4248a5738df319996a70092fe598d37` |

Optional override (recommended when the general token is DNS/read-only):

| Secret | Purpose |
|--------|---------|
| `CLOUDFLARE_WORKERS_API_TOKEN` | Prefer for Workers deploy (`||` fallback to `CLOUDFLARE_API_TOKEN`) |

`deploy-sailor-docs` resolution order:

1. Deploy Worker / preflight: `CLOUDFLARE_WORKERS_API_TOKEN` → else `CLOUDFLARE_API_TOKEN`
2. Point DNS: `CLOUDFLARE_API_TOKEN` → else Workers token (soft-fail if no DNS Edit)

## Why deploys fail with `10000 Authentication error`

A token can **verify** and **list** zones/DNS while **failing** on:

- `POST …/workers/scripts/…/assets-upload-session` (docs Worker deploy)
- `POST …/zones/…/dns_records` (DNS create/update)

That means the token is missing **Edit** scopes for Workers and/or DNS.

## Required permissions (create a new token)

Dashboard → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token**.

### Account permissions

| Permission | Level |
|------------|--------|
| **Workers Scripts** | **Edit** |
| **Workers Routes** | **Edit** |
| **Workers KV Storage** | Edit (if used) |
| **Account Settings** | Read |

### Zone permissions (zone = `nebutra.com`)

| Permission | Level |
|------------|--------|
| **Workers Routes** | **Edit** |
| **DNS** | **Edit** (for `point-*-dns` scripts) |
| **Zone** | Read |

### Account resources

- Include account id `a4248a5738df319996a70092fe598d37` (**Nebutra** production CF account).
  Dashboard may still show a legacy personal label until renamed — that label is
  **not** a product brand. Rename: Dashboard → account name → **Nebutra**;
  Workers → Account details → **workers.dev subdomain** → prefer `nebutra`
  (if free) so internal smoke hosts look like `nebutra-auth.nebutra.workers.dev`.
  End-users only ever hit branded hosts (`auth.nebutra.com`, `api.nebutra.com`, …).

### Zone resources

- Include: `nebutra.com` only (or All zones if preferred)

## One-click style start

1. Open: <https://dash.cloudflare.com/profile/api-tokens>
2. **Create Token** → start from template **Edit Cloudflare Workers**
3. Add **Zone → DNS → Edit** for `nebutra.com`
4. Create → copy token **once**
5. Update GitHub:

```bash
# from a machine that has the new token in the clipboard / env
printf '%s' "$NEW_TOKEN" | gh secret set CLOUDFLARE_API_TOKEN -R Nebutra/Nebutra-Sailor

# optional dedicated workers token
printf '%s' "$NEW_TOKEN" | gh secret set CLOUDFLARE_WORKERS_API_TOKEN -R Nebutra/Nebutra-Sailor
```

6. Verify:

```bash
bash infra/ops/scripts/verify-cloudflare-ci-token.sh
```

7. Redeploy docs:

```bash
gh workflow run "Deploy Sailor Docs" -R Nebutra/Nebutra-Sailor -f target=cloudflare
```

## Temporary production path (no Workers Edit)

Until the token is fixed:

```bash
gh variable set DEPLOY_TARGET_SAILOR_DOCS -R Nebutra/Nebutra-Sailor --body vercel
gh workflow run "Deploy Sailor Docs" -R Nebutra/Nebutra-Sailor -f target=vercel
```

Ensure `docs.nebutra.com` DNS points at Vercel (`CNAME` → `cname.vercel-dns.com` or the project-specific `*.vercel-dns-*.com`) when using Vercel as primary. Worker route can remain for later cutback.

## Related hosts

| Host | Needs |
|------|--------|
| `docs.nebutra.com` Worker | Workers Scripts **Edit** + Assets |
| `point-pebble-dns` / DNS scripts | Zone DNS **Edit** |
| Pebble brand front | Already on **ECS** (`A` → origin); no Workers token required |
