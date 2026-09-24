# create-sailor

> Governed scaffolding for AI-native SaaS. One converged stack, zero questions: Next.js + Hono + Postgres + Better Auth + Stripe, with every capability live the moment you add its key.

[![npm version](https://img.shields.io/npm/v/create-sailor.svg?color=0033FE)](https://www.npmjs.com/package/create-sailor)
[![License: MIT](https://img.shields.io/badge/License-MIT-0033FE.svg)](https://opensource.org/licenses/MIT)
[![Licensing](https://img.shields.io/badge/Licensing-MIT%20%2B%20optional%20support-0BF1C3.svg)](https://nebutra.com/licensing)

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
| Payments | Stripe, plus WeChat Pay / Alipay for mainland China |
| Email | Resend |
| SMS | Twilio Verify, plus Aliyun for mainland China |
| Object storage | any S3-compatible bucket (Cloudflare R2, Aliyun OSS) |
| Queue / cache | QStash / Redis |
| Search | Postgres (pgvector) |
| Monitoring / analytics / captcha | Sentry / PostHog / Turnstile |

Nothing is pruned and nothing is picked at scaffold time. Every capability runs
locally with an empty `.env`; adding a provider key takes it live.
`nebutra status` shows what is live and what each capability still needs.

Mainland-China deployments set `NEBUTRA_LOCALE=cn` at runtime (ICP footer, AIGC
disclosure, phone-first login) — the same code, not a different scaffold.

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
pnpm infra:up      # local Postgres (optional)
pnpm db:migrate
pnpm dev
nebutra status     # what is live, what needs a key
```

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

MIT. This package and the projects it scaffolds are MIT — commercial use is
free, with no registration, licence key, or attribution requirement.

The upstream [Nebutra-Sailor](https://github.com/Nebutra/Nebutra-Sailor)
monorepo is FSL-1.1-ALv2. Optional paid support tiers do not gate the
software. See [nebutra.com/licensing](https://nebutra.com/licensing).

---

**Built by [Nebutra](https://nebutra.com)** for teams shipping AI-native products.
