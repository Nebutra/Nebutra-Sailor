# create-sailor

> **Skip to production.** The production layer for agent-built software: auth, billing for global and China rails, multi-tenancy and an AI gateway in one command, running locally with zero keys. You own the code.

[![npm version](https://img.shields.io/npm/v/create-sailor.svg?color=0033FE)](https://www.npmjs.com/package/create-sailor)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-0033FE.svg)](https://www.apache.org/licenses/LICENSE-2.0)

## Quick Start

```bash
# npx
npx create-sailor@latest

# npm
npm create sailor@latest

# pnpm
pnpm create sailor@latest

# bun
bunx create-sailor@latest
```

## What You Get

One stack, no questions. Every project is the same converged baseline that
Nebutra runs in production:

| Capability | Provider |
|---|---|
| App + API | Next.js + Hono gateway (mounted in Next, or deployed on its own) |
| Database | Postgres + Prisma |
| Auth | Better Auth |
| Payments | Creem (cards worldwide, merchant of record), plus WeChat Pay / Alipay for mainland China |
| Email | Resend |
| SMS | Twilio Verify, plus Aliyun for mainland China |
| Object storage | any S3-compatible bucket (Cloudflare R2, Aliyun OSS) |
| Queue / cache | QStash / Redis |
| Search | Postgres (pgvector) |
| Monitoring / analytics / captcha | Sentry / PostHog / Turnstile |

Nothing is pruned and nothing is picked at scaffold time. Every capability runs
locally with an empty `.env`; adding a provider key takes it live.
`pnpm nebutra status` shows what is live and what each capability still needs.

Mainland-China deployments set `NEBUTRA_LOCALE=cn` at runtime: checkout prefers
WeChat Pay / Alipay and SMS prefers Aliyun; `NEXT_PUBLIC_ICP_NUMBER` shows the ICP
footer — the same code, not a different scaffold.

## Usage

```bash
npx create-sailor@latest my-app          # the only question is where
npx create-sailor@latest .               # into the current directory
npx create-sailor@latest my-app --json   # NDJSON events, for agents and CI
```

Options: `--pm`, `--no-install`, `--no-git`, `--yes`, `--dry-run`, `--json`,
`--no-color`. There are no stack flags.

## After Scaffolding

```bash
cd my-app
pnpm dev                  # site :3000 · app :3001/welcome · gateway :3002 — no keys, no Docker
pnpm nebutra status       # what is live, what needs a key (--json for agents)
```

The local database is PGlite (`DATABASE_URL="pglite:"`); the demo sign-in is
`admin@example.com` / `preview-demo`. Point `DATABASE_URL` at Postgres and run
`pnpm db:migrate` when you have one.

Deploy anywhere: the project builds Next `standalone` output and ships
Dockerfiles. The scaffold does not choose a platform for you.

## Why Sailor?

Sailor is not a thin starter with a long feature checklist. It is the governed
platform baseline Nebutra uses for AI-native SaaS: auth, billing, branding,
docs, tenant-aware app structure, and AI integration are scaffolded into a
single monorepo you can extend instead of re-assembling from scratch.

## Roadmap

- **Verified scaffolding** — immutable template delivery, scaffold smoke validation, and safer bootstrap defaults
- **Harness runtime** — stronger MCP, agent, and automation primitives for AI-native SaaS workflows
- **Upgrade path** — version-aware migrations, diagnostics, and guided adoption of new platform capabilities

## Documentation

- **Getting Started**: [nebutra.com/docs/getting-started/installation](https://nebutra.com/docs/getting-started/installation)
- **Customization Guide**: [nebutra.com/docs/customization/overview](https://nebutra.com/docs/customization/overview)
- **Licensing**: [nebutra.com/licensing](https://nebutra.com/licensing)

## License

Apache-2.0 — this package, the Sailor monorepo it scaffolds from, and every
project it generates. Each project gets the Apache-2.0 `LICENSE` and a
`NOTICE`: commercial use and closed source are free, with no registration or
licence key. Keep `LICENSE` and `NOTICE` when you redistribute the source.
Optional paid support plans never gate the software — see
[nebutra.com/licensing](https://nebutra.com/licensing).

---

**Built by [Nebutra](https://nebutra.com)** for teams shipping AI-native products.
