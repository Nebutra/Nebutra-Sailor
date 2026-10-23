<div align="right">
  <strong>English</strong> | <a href="README.zh-CN.md">简体中文</a> | <a href="README.ja.md">日本語</a>
</div>

<div align="center">
  <a href="https://nebutra.com/sailor">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/design/brand/assets/logo/logo-inverse.svg" />
      <source media="(prefers-color-scheme: light)" srcset="packages/design/brand/assets/logo/logo-horizontal-en.svg" />
      <img alt="Nebutra" src="packages/design/brand/assets/logo/logo-horizontal-en.svg" width="260" />
    </picture>
  </a>
  <h1>Sailor — Skip to production.</h1>
  <p>The production layer for agent-built software: auth, billing for global and China rails, multi-tenancy and an AI gateway in one command, running locally with zero keys. You own the code. Open source under Apache-2.0.</p>
  <p>
    <a href="https://github.com/Nebutra/Nebutra-Sailor/actions/workflows/scaffold-nightly.yml"><img src="https://github.com/Nebutra/Nebutra-Sailor/actions/workflows/scaffold-nightly.yml/badge.svg" alt="Nightly: scaffold from zero" /></a>
    <a href="https://www.npmjs.com/package/create-sailor"><img src="https://img.shields.io/npm/v/create-sailor?label=create-sailor&color=18191c" alt="npm: create-sailor" /></a>
    <a href="#license"><img src="https://img.shields.io/badge/license-Apache--2.0-2e65ee" alt="License: Apache-2.0" /></a>
    <a href="https://github.com/Nebutra/Nebutra-Sailor/stargazers"><img src="https://img.shields.io/github/stars/Nebutra/Nebutra-Sailor?color=18191c" alt="GitHub stars" /></a>
  </p>
  <p>
    <a href="https://nebutra.com/sailor"><strong>Website</strong></a> ·
    <a href="https://nebutra.com/docs"><strong>Docs</strong></a> ·
    <a href="https://nebutra.com/sailor/compare"><strong>Compare</strong></a> ·
    <a href="https://github.com/Nebutra/Nebutra-Sailor/discussions"><strong>Discussions</strong></a> ·
    <a href="https://linux.do"><strong>LINUX DO</strong></a>
  </p>
</div>

<!-- VIDEO: the 60-second launch video replaces the recording below. -->
<p align="center"><img src="docs/assets/sailor-create.gif" width="720" alt="A real run of npx create-sailor@latest: download the template, write the project, print next steps" /></p>

**You** — scaffold, then run it. No keys, no Postgres to install (PGlite runs locally):

```bash
npx create-sailor@latest my-app
cd my-app && pnpm dev        # app :3001 · site :3000 · gateway :3002
```

**Your agent** (Claude Code, Cursor, Codex, …) — install the skill, then ask it to build:

```bash
npx skills add Nebutra/Nebutra-Sailor --skill sailor
```

| In the box | Where it lives |
| --- | --- |
| Billing: Creem for cards worldwide (merchant of record) + WeChat Pay / Alipay; subscriptions, credits, entitlements, usage | `packages/commerce/billing` |
| Multi-tenancy: a `/// @rls` line in `schema.prisma` generates the Postgres policies (91 today) | `packages/platform/db`, `packages/iam/tenant` |
| One API: Hono gateway mounted in Next at `/api` (one process), or deployed on its own | `backends/gateway` |
| Auth: Better Auth with organizations, plus an OIDC identity provider | `packages/iam/auth`, `apps/idp` |
| One provider per domain — Resend, S3-compatible storage (R2 / OSS), QStash, Redis, pgvector search, Sentry, PostHog, Turnstile. A key makes it live; without one it falls back locally | `nebutra status --json` |
| Guards an agent can't quietly break: `AGENTS.md` / `CLAUDE.md` / `DESIGN.md`, Biome and shrink-only lint ratchets | `pnpm lint` |
| Design system: `@nebutra/ui`, W3C DTCG tokens, 541 Geist icons, 7 brand languages, Storybook | `packages/design` |
| China switch: `NEBUTRA_LOCALE=cn` puts WeChat Pay / Alipay first at checkout, Aliyun first for SMS, and the project ships an ICP footer and an AIGC notice component; OSS goes through the S3 adapter | `@nebutra/contracts/market` |
| CLI: `nebutra status` for agents, device-flow `nebutra login` | `npx nebutra` |

**Not in the box:** a provider menu (one adapter per domain — write your own against the interface), a hosting choice (you get Next `standalone` builds and Dockerfiles), phone-first sign-in (Better Auth's phone plugin is not wired yet), template upgrades by three-way merge, mobile or desktop apps, and a small codebase — this is a full monorepo, not a 50-file starter. Side by side with other starters: [nebutra.com/sailor/compare](https://nebutra.com/sailor/compare).

**License:** Apache-2.0 — this repository, every npm package and the project you generate. Details in [License](#license).

<br />

## Tech Stack

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/sailor-stack-dark.png" />
  <img src="docs/assets/sailor-stack-light.png" width="100%" alt="What create-sailor gives you: apps/web calls the Hono gateway at /api, which reaches Postgres with generated row-level security; each capability goes live with a key and otherwise falls back locally or stays off" />
</picture>

One answer per layer — what Nebutra runs in production ([ADR 2026-09-24](docs/architecture/2026-09-24-sailor-convergence.md)).

| Layer | Choice |
| --- | --- |
| App | Next.js 16 · React 19 · TypeScript · Tailwind 4 |
| API | Hono gateway (`backends/gateway`) · oRPC · Zod |
| Data | Postgres + Prisma 7 · generated RLS · pgvector · ClickHouse (metering) · PGlite locally |
| Auth | Better Auth (organizations) · OIDC provider (`apps/idp`) · CASL permissions |
| Payments | Creem + WeChat Pay / Alipay |
| Messaging | Resend · Twilio Verify + Aliyun SMS · QStash · Redis |
| Storage | One S3-compatible adapter (Cloudflare R2, Aliyun OSS) |
| Observability | Sentry · PostHog · OpenTelemetry |
| UI | `@nebutra/ui` (Radix) · W3C DTCG tokens · Geist icons · Storybook |
| AI | Vercel AI SDK · MCP · Python FastAPI service only for batch / ML work |
| Tooling | pnpm · Turborepo · Biome · Vitest · Playwright · changesets |

<br />

## Platform Capabilities

Sailor ships **one provider per domain** ([ADR 2026-09-24](docs/architecture/2026-09-24-sailor-convergence.md)): every platform package reads its keys from the environment and falls back to a local implementation without them, so `pnpm dev` works with an empty `.env`. Each package ships an in-memory implementation for tests and a strict TypeScript contract enforced by architecture tests under [tests/architecture/](tests/architecture/).

<table>
<tr><th>Capability</th><th>Package</th><th>Providers (auto-detected)</th></tr>
<tr><td>Authentication</td><td><code>@nebutra/auth</code></td><td>Better Auth (organizations, passkeys)</td></tr>
<tr><td>Identity Provider</td><td><code>@nebutra/oauth</code></td><td>OIDC (oidc-provider) · Redis-backed sessions</td></tr>
<tr><td>Permissions</td><td><code>@nebutra/permissions</code></td><td>CASL — RBAC + ABAC, Hono middleware, React <code>&lt;Can /&gt;</code></td></tr>
<tr><td>Multi-tenancy</td><td><code>@nebutra/tenant</code></td><td>AsyncLocalStorage context · Prisma RLS bridge</td></tr>
<tr><td>Captcha</td><td><code>@nebutra/captcha</code></td><td>Cloudflare Turnstile</td></tr>
<tr><td>Vault (secrets)</td><td><code>@nebutra/vault</code></td><td>AWS KMS envelope · local HKDF (dev)</td></tr>
<tr><td>Audit log</td><td><code>@nebutra/audit</code></td><td>Append-only with hash chain</td></tr>
<tr><td>Cache</td><td><code>@nebutra/cache</code></td><td>Redis over the Upstash REST protocol · in-memory</td></tr>
<tr><td>Rate limit</td><td><code>@nebutra/rate-limit</code></td><td>Sliding window · token bucket (Upstash)</td></tr>
<tr><td>Queue</td><td><code>@nebutra/queue</code></td><td>QStash · in-memory</td></tr>
<tr><td>Search</td><td><code>@nebutra/search</code></td><td>Postgres — pgvector + full-text</td></tr>
<tr><td>Storage / Uploads</td><td><code>@nebutra/uploads</code></td><td>One S3-compatible adapter (Cloudflare R2, Aliyun OSS) · local FS</td></tr>
<tr><td>Notifications</td><td><code>@nebutra/notifications</code></td><td>Built-in dispatch — in-app · email · push · SMS · chat</td></tr>
<tr><td>Webhooks</td><td><code>@nebutra/webhooks</code></td><td>Built-in HMAC-signed delivery with retries</td></tr>
<tr><td>SMS</td><td><code>@nebutra/sms</code></td><td>Twilio Verify + Aliyun</td></tr>
<tr><td>Email</td><td><code>@nebutra/email</code></td><td>Resend + React Email templates</td></tr>
<tr><td>Billing</td><td><code>@nebutra/billing</code></td><td>Creem (cards worldwide, merchant of record) + WeChat Pay/Alipay — subscriptions, usage, entitlements</td></tr>
<tr><td>Metering</td><td><code>@nebutra/metering</code></td><td>ClickHouse real-time aggregation</td></tr>
<tr><td>Event bus</td><td><code>@nebutra/event-bus</code></td><td>Multi-tenant Pub/Sub · Fan-out · Request-Reply</td></tr>
<tr><td>Saga orchestrator</td><td><code>@nebutra/saga</code></td><td>Native TS workflows with auto-rollback compensations</td></tr>
<tr><td>Feature flags</td><td><code>@nebutra/feature-flags</code></td><td>Database-backed with env-driven overrides</td></tr>
<tr><td>Design tokens</td><td><code>@nebutra/design-sync</code></td><td>W3C DTCG, git-only</td></tr>
<tr><td>Status aggregation</td><td><code>@nebutra/status</code></td><td>OpenStatus · Atlassian StatusPage</td></tr>
<tr><td>Admin tooling</td><td><code>@nebutra/admin-tooling</code></td><td>Thin admin (dashboard + impersonate only) + integration recipes for Retool, Metabase, Hex — Sailor expects you to use best-of-breed internal tools instead of self-building. See <a href="./docs/admin/">docs/admin/</a>.</td></tr>
</table>

<br />

## Project Structure

```
Nebutra-Sailor/
├── apps/                      # User-facing apps (Next.js)
│   ├── landing/      # Marketing site (nebutra.com)
│   ├── web/               # Main SaaS dashboard (app.nebutra.com)
│   ├── studio/            # Sanity CMS (studio.nebutra.com)
│   ├── sailor-docs/       # Public product docs (nebutra.com/docs)
│   ├── idp/               # Identity provider service (OAuth 2.0 / OIDC)
│   ├── storybook/         # Component playground
│   ├── mail-preview/      # Email template preview
│   ├── sleptons/          # Sleptons companion app
├── packages/                  # Shared TS libraries (categorized in W3b)
│   ├── ai/                # 42 pkgs — e.g. agents, agent-runtime, ai-providers, startup-os, knowledge-rag, mcp
│   ├── commerce/          # 9 pkgs — e.g. billing, metering, contracts, license, access-gate, waitlist
│   ├── design/            # 8 pkgs  — e.g. ui, tokens, design-tokens, brand, theme, icons, fonts
│   ├── iam/               # 8 pkgs — auth, audit, vault, oauth, permissions, tenant, identity, captcha
│   ├── integrations/      # 17 pkgs — e.g. queue, search, email, notifications, storage, webhooks, cache
│   ├── ops/               # 5 pkgs — cli, create-sailor, preset, sanity, china-compliance
│   └── platform/          # 21 pkgs — e.g. db, logger, repositories, rate-limit, feature-flags, i18n, status
├── backends/                  # No-UI backends (split by language à la vercel/vercel)
│   ├── gateway/               # TypeScript / Hono — BFF, auth, tenancy, routing
│   └── python/                # FastAPI — only when ML/batch/specialized libs justify
│       ├── _shared/           # Cross-service primitives (auth, db, queue client)
│       └── ai/                # LLM, embeddings, agent orchestration
├── infra/                     # Infrastructure (split by concern in W2.2)
│   ├── iac/                   # terraform + k8s + ecs + cloudflare + railway
│   ├── runtime/               # nginx + docker + analytics + compose files
│   ├── data/                  # database (RLS) + clickhouse (init + dbt)
│   └── ops/                   # observability + deployment scripts
├── ops/                       # Declared provider state per brand, checked daily by platform-reconcile
├── workflows/                 # Event-driven business workflows (extracted in W2.3)
│   ├── inngest/               # Serverless background jobs + cron
│   └── pusher/                # Real-time messaging glue
├── e2e/                       # Playwright E2E tests (smoke / golden / sleptons)
├── tests/                     # Architecture invariants + load tests + UI governance
└── docs/                      # Architecture documentation
```

<br />

## Documentation

Each component has its own README with setup instructions and API documentation:

<table>
<tr>
<td><strong>Services</strong></td>
<td>
  <a href="backends/python/ai/">AI</a>
</td>
</tr>
<tr>
<td><strong>Packages</strong></td>
<td>
  <a href="packages/commerce/billing/">Billing</a> · 
  <a href="packages/commerce/legal/">Legal</a> · 
  <a href="packages/design/ui/">UI</a> ·
  <a href="packages/design/tokens/">Tokens</a> ·
  <a href="packages/commerce/marketing/">Marketing UI</a> · 
  <a href="packages/design/brand/">Brand</a> · 
  <a href="packages/platform/db/">DB</a> · 
  <a href="packages/integrations/cache/">Cache</a> · 
  <a href="packages/platform/rate-limit/">Rate Limit</a> · 
  <a href="packages/ai/mcp/">MCP</a> · 
  <a href="packages/ai/ai-providers/">AI Providers</a> · 
  <a href="packages/platform/analytics/">Analytics</a>
</td>
</tr>
<tr>
<td><strong>Design Docs</strong></td>
<td>
</td>
</tr>
<tr>
<td><strong>Infrastructure</strong></td>
<td>
  <a href="infra/runtime/docker/">Docker</a> · 
  <a href="infra/iac/terraform/">Terraform</a> · 
  <a href="workflows/inngest/">Inngest</a> · 
  <a href="workflows/pusher/">Pusher</a> · 
  <a href="infra/ops/observability/">Observability</a>
</td>
</tr>
</table>

<br />

## CLI & Website

### Use the CLI from npm

For new projects, start from npm instead of cloning and pruning the full monorepo:

```bash
# Scaffold a new Sailor project
npx create-sailor@latest
npm create sailor@latest
pnpm create sailor@latest
bunx create-sailor@latest

# Operate an existing Sailor project
npx nebutra --help
npm install -g nebutra
```

| Package | Use it for |
| ------- | ---------- |
| [`create-sailor`](https://www.npmjs.com/package/create-sailor) | Scaffold a new Nebutra Sailor project. Zero questions: the same converged stack every time (`--json` for agents and CI). |
| [`nebutra`](https://www.npmjs.com/package/nebutra) | Operate an existing project: `status` (what is live, what needs a key), `sync`, `db`, `dev`, device-flow `login`. |

### nebutra.com

[`nebutra.com`](https://nebutra.com) is the public product surface for Nebutra Sailor and the place where we dogfood the platform ourselves. We will use it to publish product updates, commercial licensing, hosted capabilities, launch workflows, and real examples built on this monorepo.

The public tool station lives at [`forge.nebutra.com`](https://forge.nebutra.com) — codecs, text, hashing, documents, and image tools, with the same implementations available over API / MCP.

<br />

## Getting Started

### Prerequisites

<table>
<tr><td><strong>Node.js</strong></td><td><code>v22+</code></td></tr>
<tr><td><strong>pnpm</strong></td><td><code>v11.28.5+</code></td></tr>
<tr><td><strong>Python</strong></td><td><code>3.11+</code> <sub>(for microservices)</sub></td></tr>
</table>

### Work on this monorepo

To build a product, scaffold with `npx create-sailor@latest` (top of this page). Clone this repository to contribute to Sailor itself:

```bash
# Clone the repository
git clone https://github.com/Nebutra/Nebutra-Sailor.git
cd Nebutra-Sailor

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env

# Generate Prisma client & run dev servers
pnpm db:generate && pnpm dev
```

### Commands

| Command            | Description                                  |
| ------------------ | -------------------------------------------- |
| `pnpm dev`         | Start all apps in dev mode                   |
| `pnpm build`       | Build all packages (auto-syncs brand assets) |
| `pnpm lint`        | Lint all packages                            |
| `pnpm typecheck`   | Type check all packages                      |
| `pnpm db:studio`   | Open Prisma Studio                           |
| `pnpm brand:sync`  | Sync brand assets to apps                    |
| `pnpm brand:init`  | Initialize white-label branding              |
| `pnpm brand:apply` | Apply custom branding                        |

<br />

## White-label

Fork this repo and customize it for your own brand:

```bash
# Interactive setup wizard
pnpm brand:init

# Add your logos to brand.config/assets/

# Apply your branding
pnpm brand:apply
```

See [WHITELABEL.md](WHITELABEL.md) for full documentation.

<br />

## Contributing

We love our contributors! Here's how you can help:

|                      |                                                                   |
| -------------------- | ----------------------------------------------------------------- |
| **Report Bugs**      | [Open an issue](https://github.com/Nebutra/Nebutra-Sailor/issues) |
| **Feature Requests** | Suggest new features via issues                                   |
| **Pull Requests**    | Submit PRs for features or fixes                                  |

### Development Workflow

```
1. Fork the repository
2. Create a feature branch (git checkout -b feat/amazing-feature)
3. Commit your changes (git commit -m 'feat: add amazing feature')
4. Push to the branch (git push origin feat/amazing-feature)
5. Open a Pull Request
```

<br />

## Versioning & Release Cadence

Every published package is in the **0.x range** while public APIs are still
settling. Per [SemVer §4](https://semver.org/#spec-item-4), the major-version-zero
contract means **any 0.x release may include breaking changes** — pin to an
exact version (`"nebutra": "0.3.1"`) rather than a caret range in production
until we cut a 1.0.

- Versioning is driven by [changesets](https://github.com/changesets/changesets). Each PR that touches a published package must include a `.changeset/*.md` declaring patch/minor/major intent — CI enforces this gate.
- Per-package `CHANGELOG.md` is generated by `changeset version` and committed alongside the version bump (see e.g. [`packages/ops/cli/CHANGELOG.md`](packages/ops/cli/CHANGELOG.md)).
- The Release workflow is **manual** (`workflow_dispatch`) — no surprise releases on PR merges. We batch related changes and cut a coordinated release.
- Pre-1.0 major API moves (e.g. CLI command renames, package categorization) ship as a **release candidate** first: `nebutra@0.4.0-rc.0` lands on the `next` dist-tag, soaks for ≥ 1 week, then graduates to `latest`. Install RCs with `npm i nebutra@next`.
- npm publishes carry **provenance attestations** once npm trusted-publishing is enabled at the registry side (the workflow side is already wired — see [`release.yml`](.github/workflows/release.yml) `NPM_CONFIG_PROVENANCE: "true"`). Verify a published tarball with `npm view <pkg> --json | jq .dist.attestations`.

We will signal **API stability** by cutting a `1.0.0` release. Until then,
treat the surface as "production-ready in shape, evolving in detail."

<br />

## License

**Nebutra Sailor is open source under the [Apache License 2.0](./LICENSE).**
That covers this repository, every published npm package (`@nebutra/*`,
`nebutra`, `create-sailor`), the Sailor-Template mirror, and every project
`create-sailor` generates (it ships the Apache-2.0 `LICENSE` and a `NOTICE`).

Build a commercial product on it, keep your source closed, run it as a hosted
service, fork it — all free, with no fee, licence key, registration or
copyleft. When you redistribute the source, keep `LICENSE` and `NOTICE`, keep
existing copyright notices, and mark the files you changed (Apache-2.0 §4).

Trademarks are separate: Apache-2.0 does not grant them (§6). Naming your own
product something unrelated needs no permission; using the Nebutra or
Sailor names needs a trademark licence ([TRADEMARK.md](./TRADEMARK.md)).

**Paid plans do not sell permission.** They sell what a code licence cannot
give you: a support commitment, response SLAs, indemnification, compliance
paperwork (DPA, security pack, continuity undertaking), and trademark rights.
Community $0 · Team $2,000/yr · Enterprise from $30,000/yr — see
[docs/legal/commercial-support.md](docs/legal/commercial-support.md).

Copyright 2025–2026 Wuxi Nebutra Intelligence Technology Co., Ltd..

> Relicensed to Apache-2.0 on 2026-10-16 (previously FSL-1.1-ALv2 for the
> repository and MIT for npm packages; AGPL-3.0-only before 2026-07-26).
> Versions released earlier keep the licence they shipped with. See
> [docs/legal/license-history.md](docs/legal/license-history.md).

Licensing questions: **legal@nebutra.com** ·
[Licensing FAQ](docs/legal/licensing-faq.md)

### Brand Assets & Trademarks

While the source code is open-source, the **brand assets** (the "Nebutra" name, "Nebutra Sailor", logos, icons, and illustrations) are protected trademarks of Wuxi Nebutra Intelligence Technology Co., Ltd.

You may not use our brand assets to endorse your own products or services. If you clone or fork this repository to build your own product, you **must** replace all Nebutra logos and branding with your own.

Please see our [Trademark Policy](TRADEMARK.md) and [Brand Guidelines](BRAND_GUIDELINES.md) for more information.

<br />

---

<br />

<div align="center">
  <a href="https://nebutra.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/design/brand/assets/logo/logo-inverse.svg" width="120">
      <source media="(prefers-color-scheme: light)" srcset="packages/design/brand/assets/logo/logo-mono.svg" width="120">
      <img alt="Nebutra" src="packages/design/brand/assets/logo/logo-mono.svg" width="120">
    </picture>
  </a>
  <br />
  <br />
  <p>
<strong>Every release, growth goes live.</strong>
  </p>
  <p>
    <sub>Made by <a href="https://nebutra.com"><strong>Nebutra Intelligence</strong></a> · © 2024-present <strong>Wuxi Nebutra Intelligence Technology Co., Ltd.</strong></sub>
  </p>
  <br />
  <p>
    <a href="https://nebutra.com">Website</a>
  </p>
  <p>
    <a href="https://x.com/nebutra">X</a>
  </p>
  <p>
    <a href="mailto:contact@nebutra.com">Contact</a>
  </p>
</div>
