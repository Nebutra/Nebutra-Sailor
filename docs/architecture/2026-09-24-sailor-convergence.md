# Sailor Convergence — one stack, zero-question scaffold, one CLI trunk

- **Status**: Accepted
- **Date**: 2026-09-24
- **Owner**: Tseka Luk
- **Related**: ADR 2026-09-08 product intelligence phase (one canonical implementation per domain),
  ADR 2026-06-04 production runtime closure (`DEPLOY_TARGET_*`), ADR 2026-05-10 TS-by-default
  (three-tier lifecycle), `apps/idp/AGENTS.md` (grant-type freeze), `TEMPLATE.md`

## Context

Sailor is a boilerplate. Its scaffolder and CLI ask the buyer to make decisions the buyer cannot
make yet, and an agent driving the CLI cannot make them either:

- `create-sailor` exposes 43 flags, most of them vendor choices (`--payment --email --storage
  --queue --search --cache --sms --cms --captcha --monitoring --analytics --notifications
  --webhooks --feature-flags --metering --mcp …`). The integration packages already resolve their
  provider from env at runtime, so asking at scaffold time contradicts the architecture.
- The scaffold is subtractive: download the whole monorepo (126 MB mirror), then `prune.ts`,
  `prune-schema.ts` and `prune-migrations.ts` cut dependencies, schema and migrations by string
  surgery. The flag combinations cannot be tested.
- Integrations have two write paths (`create-sailor --queue=…` via `*-meta.ts`, and
  `nebutra add queue`).
- `--region` is a bundle of vendor defaults (`regionDefaults`, `create-sailor/src/steps/mappers.ts:241`),
  and some of the CN choices it offers have no backing code (no CN email adapter, no CN storage
  adapter, no Baidu analytics).
- The `nebutra` CLI (37 commands) serves three audiences in one published package: template buyers,
  the Nebutra company operator (`admin`, `community`, `growth`, `stats` — defaulting to
  `localhost`), and ecosystem members (`ecosystem`, with placeholder URLs). 21 commands delegate to
  monorepo scripts and do nothing outside this repo.
- The product has two backends: 90 Next route handlers in `apps/web` plus `backends/gateway`,
  with overlapping domains (`startup-os`, `webhooks`, `uploads`).

The owner's direction: converge, stop choosing.

## Decision

### 1. One provider per domain; production usage is the tiebreak

Where a domain has several adapters, the one Nebutra production runs is kept and the rest are
**deleted** (not demoted to stub). Inventory as of this ADR:

| Domain | Keep | Delete | Evidence |
|---|---|---|---|
| Auth | Better Auth | Clerk, NextAuth, Supabase adapters | `deploy-fly.yml`, `infra/fly/{kuanlan,para}.toml` hardcode `better-auth` |
| Payment | Stripe **+ ChinaPay (WeChat/Alipay)** — hard constraint, §2 | Polar, LemonSqueezy | Only Stripe secrets in deploy workflows |
| Email | Resend | Nodemailer (keep `console` as dev sink) | `deploy-ecs.yml` Resend keys |
| SMS | **Aliyun + Twilio Verify** — hard constraint, §2 | Tencent | package exists, `foundation`; not wired in prod |
| Storage / uploads | R2 (S3-compatible) — one S3 client covers R2 and OSS | Vercel Blob provider | `packages/integrations/storage/src/r2.ts` |
| Queue | QStash | BullMQ | `QSTASH_TOKEN` in deploy workflows |
| Search | Postgres (pgvector / FTS) | Meilisearch, Typesense, Algolia | no search provider wired in prod |
| Cache | Redis via the Upstash REST protocol | alternative cache backends | branch `feat/fly-redis`: self-hosted Redis behind SRH, same client |
| Notifications | built-in direct dispatch | Novu | no `NOVU_API_KEY` in prod |
| Webhooks | built-in custom delivery | Svix | no `SVIX_API_TOKEN` in prod |
| Analytics | PostHog | — | only integration in code |
| Monitoring | Sentry | — | `SENTRY_DSN` in prod |
| Captcha | Turnstile | — | only one in code |
| CMS | Sanity (`apps/studio`) | — | Sanity keys in prod |
| Metering | ClickHouse | — | live in prod |
| Vault | local HKDF, AWS KMS as the documented upgrade | — | `VAULT_LOCAL_MASTER_KEY` |
| Permissions | CASL | OpenFGA | no `OPENFGA_*` in prod |
| Design sync | git-only | Figma, Penpot | dev tool; nothing configured |
| ORM / DB | Prisma + Postgres | Drizzle scaffold template | Prisma is the only runtime ORM |

Feature flags have no runtime package; the scaffold option is removed and nothing replaces it.

### 2. Two adapters only where law or network forces it

A domain may keep a second, China-market adapter only when a legal or network constraint makes the
default unusable in China. Preference (latency, familiarity) does not qualify.

| Domain | Pair | Constraint |
|---|---|---|
| Payment | Stripe + WeChat Pay/Alipay | Stripe cannot collect from mainland consumers (legal/financial) |
| SMS | Twilio Verify + Aliyun | Phone login is the mainland identity norm; carrier registration (legal/network) |
| Object storage | R2 + OSS, **one S3-compatible adapter** | Data residency under PIPL (legal); no second code path |

Email, analytics, captcha and everything else stay single-provider. Adding a pair requires
amending this table with the constraint named.

### 3. Region is not a scaffold decision

`--region` and `regionDefaults` are removed. Both adapters of every pair ship in the code; the keys
present at deploy time decide which run, and both may run at once (Stripe and WeChat Pay side by
side is what "hybrid" meant). Locale-dependent surfaces — ICP number, PIPL privacy text,
phone-first login — are configuration read at runtime (`NEBUTRA_LOCALE`), present in every
scaffold.

### 4. Zero-question scaffold

`create-sailor <dir>` asks for nothing but the directory. It generates the full converged stack:

- All provider flags, `*-meta.ts` files, `review-defaults.ts`, `regionDefaults`, and the prune
  pipeline (`prune.ts`, `prune-schema.ts`, `prune-migrations.ts`, `wave-features.ts`) are deleted.
- Remaining flags are mechanical: `--no-install`, `--no-git`, `--dry-run`, `--json`.
- `foundation` packages are not part of the default scaffold; they are added explicitly and shown
  as `preview` by `nebutra status`.
- An unconfigured capability degrades to a local implementation (console email, memory queue,
  local storage) so `pnpm dev` works with an empty `.env`.

### 5. Deployment is not a choice

The template produces portable output — Next `standalone` builds and Dockerfiles — and says
nothing about where they run. `DEPLOY_TARGET_*` selectors and per-platform config (Fly, Cloudflare,
ECS) move to `ops/nebutra/`, which `TEMPLATE.md` already strips. Nebutra's own CF + Fly topology is
unchanged.

### 6. The gateway is the only business API

- All business endpoints live in `backends/gateway` (Hono). `apps/web` route handlers are limited
  to what is intrinsically Next: auth callbacks, OG/image routes, framework hooks.
- Default shape in the template: the Hono app is mounted in Next at `app/api/[[...route]]` —
  one process, one origin, one deploy, no cross-origin session forwarding.
- The same gateway builds standalone for independent scaling; Nebutra runs it on Cloudflare
  Workers.
- A shrink-only ratchet (`scripts/lint-route-handlers.mjs`, allowlist in
  `governance.config.json`) freezes the current 90 handlers and fails CI on new business handlers.
  Existing ones migrate on-touch.

### 7. Public CLI serves the template buyer only

`nebutra` keeps the buyer's trunk: `login`, `logout`, `whoami`, `link`, `status`, `sync`, `dev`,
`db`, `upgrade`. Every public command must pass against a freshly scaffolded project outside this
monorepo (new golden e2e gate).

- Remove from the published package: `admin`, `community`, `growth`, `stats` (operator work belongs to the admin desk, not a CLI buyers install).
- Remove until the backing API exists: `ecosystem`.
- `create` stops wrapping `create-sailor`; there is one creation entry point.
- `nebutra add` is replaced by `sync` against a declared capability list in `nebutra.json`
  (capabilities only, no providers — providers come from env).
- `nebutra status [--json]` is the machine interface: per capability `live` / `local-fallback` /
  `missing-key` / `preview`, with a `next` action. Agents read status, act, re-read.

### 8. Unified login — device flow, once

`nebutra login` authenticates the **buyer identity** (license, template updates, future paid
registry), modelled on Vercel / `gh`:

- Browser available: open the verification page (`/device` on the auth center) and confirm the
  device code shown in the terminal; no code typed unless the browser can't be opened.
- `nebutra login --json` returns `{ verification_uri, verification_uri_complete, user_code,
  expires_in, interval }` immediately and exits 0; the agent hands the link to the user, then
  `nebutra login --poll --json` resumes and blocks to completion. One authorization click by the
  user, no repeated steps.
- Session token in the OS keychain (fallback `~/.config/nebutra/credentials.json`, mode 0600).
  `NEBUTRA_TOKEN` for CI. Better Auth's `deviceAuthorization` plugin returns a session token with
  an expiry, not an OAuth refresh-token pair — there is no silent refresh; the CLI re-prompts with
  `nebutra login` once the stored token's `expiresAt` passes.
- `license` becomes an internal check on the logged-in identity.

**Landed 2026-09-25, on `apps/auth` (the Better Auth "auth center"), not `apps/idp`.** The device
flow is Better Auth's own `deviceAuthorization` (+ `bearer`) plugin, mounted only when
`apps/auth`'s Better Auth instance opts in via `AuthConfig.options.deviceAuthorization` (see
`packages/iam/auth/src/providers/better-auth/device-authorization.ts`) — every other app that
constructs a Better Auth instance from the same shared provider (`apps/web`, `apps/forge`,
`apps/kuanlan`, …) does not set that flag, so `/api/auth/device/*` exists nowhere else. Client id
is the fixed public `nebutra-cli`, validated server-side; no dynamic client registration.

Production auth-center traffic does not run that Node route at all — `auth.<brand-apex>` is a
Cloudflare Workers edge (`apps/auth/src/worker-edge.ts`, Kysely on a raw `pg.Pool`, not Prisma;
see ADR 2026-06-04) that mounts the identical plugin pair from the same options builder
(`packages/iam/auth/src/providers/better-auth/device-authorization-config.ts`, a zero-runtime-import
file exported as `@nebutra/auth/device-authorization-config` so the edge's size-constrained bundle
can import just it — not the rest of `@nebutra/auth` — without pulling in Prisma). The backing
table (`public.auth_device_codes`, snake_case) therefore lives beside `auth_users`/`auth_sessions`
rather than in the `better_auth`-schema tables Better Auth's `organization`/`passkey` plugins use,
because the edge's Kysely adapter can only see `public`-schema tables addressed by literal name.

**`apps/idp/AGENTS.md`'s grant-type freeze is untouched — no amendment needed.** The original plan
above assumed the OIDC-flavoured IdP app would gain the grant; instead the whole flow lives beside
Better Auth's own session issuance on the auth center, which already has its own (separate,
cookie/session-based, not OIDC-token-based) auth surface. `apps/idp`'s `authorization_code` +
`refresh_token`-only OIDC grants are exactly as frozen as before this ADR's §8 landed.

## Consequences

- The scaffold becomes testable: one output shape, one golden e2e, instead of an unbounded flag
  matrix. The 126 MB mirror download is no longer needed for pruning.
- Buyers who wanted Polar, Clerk, Meilisearch or BullMQ write their own adapter against the kept
  interface. This is the intended trade.
- `CLAUDE.md` sections that advertise alternatives (queue, search, notifications, webhooks,
  permissions, design sync, deployment targets) shrink to the single answer.
- IdP gains one grant type; security review required before release.

## Execution order

1. This ADR accepted; `CLAUDE.md` and `docs/package-status.md` updated to the single answers.
2. Delete non-kept adapters (one PR per package, each with its callers and tests).
3. Scaffold: remove flags, meta files, region and prune pipeline; add the golden e2e.
4. Gateway mount in Next + route-handler ratchet.
5. CLI split (`ops/nebutra/` operator tools), `status` / `sync`.
6. IdP device flow + `nebutra login`.

## Status (2026-09-24)

Landed in the first batch: §1 adapter deletions, §2 pairs, §3 region removal,
§4 zero-question scaffold, §5 (template deploy files reduced to a portable
`Dockerfile.web` + `docker-compose.yml`), the §6 route-handler ratchet, and §7
(12 commands removed, `nebutra status` added).

Second batch (2026-09-25): §6 gateway mount, §7 `nebutra sync`, and §8
device-flow login. `apps/sleptons` keeps its direct Clerk integration — it is
Nebutra's own product and is stripped from the template.

§6 landed: `apps/web` mounts the gateway (`backends/gateway`, via a new
`createGatewayApp({ startWorkers })` factory in `src/app.ts` — `src/index.ts`
is now a thin standalone-entry wrapper around it) at the optional catch-all
`app/api/[[...route]]/route.ts`, gated by `GATEWAY_MODE` (`embedded` default;
`external` 404s every unmatched `/api/*` path and mounts nothing). Nebutra's
own production sets `GATEWAY_MODE=external` (`infra/fly/web.toml`) — the
gateway keeps running standalone on Cloudflare Workers + Fly, unchanged; the
browser already calls it directly via `NEXT_PUBLIC_API_GATEWAY_URL` /
`NEXT_PUBLIC_API_URL`, so external mode has nothing to proxy. Embedded mode
never starts the gateway's background queue workers inside Next's
request-handling process — those still run via the QStash webhook delivery
route the app mounts either way. The catch-all is intrinsic to the
route-handler ratchet (`governance.config.json` →
`routeHandlers.intrinsic`), not a business handler of its own.

§8 device-flow login landed 2026-09-25 on `apps/auth`, not `apps/idp` — see §8 above for why no
IdP contract amendment was needed. Still pending: the security review noted there (see the
feature branch's own report for the checklist run so far) and a live end-to-end run against a
real Postgres (verified only via `npx tsc --noEmit` / unit + mock-server tests in that branch, not
against a running auth-center + database).

## Open questions

- Uploads: which provider (`s3` vs `blob`) production selects is unconfirmed; the table assumes
  the S3-compatible path.
- Tencent SMS: deleted unless a customer contract depends on it.
- `apps/web/.env.example` still defaults `AUTH_PROVIDER=clerk`; fixed in step 2.
