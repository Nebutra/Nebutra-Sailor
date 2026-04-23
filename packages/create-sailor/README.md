# create-sailor

> Governed scaffolding for AI-native SaaS. Bootstrap the Nebutra Sailor platform baseline with multi-tenant foundations, region-aware defaults, and production-ready AI integrations.

[![npm version](https://img.shields.io/npm/v/create-sailor.svg?color=0033FE)](https://www.npmjs.com/package/create-sailor)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-0033FE.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Commercial License](https://img.shields.io/badge/Licensing-Commercial%20Options-0BF1C3.svg)](https://nebutra.com/licensing)

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

- **Governed platform baseline** — web app, marketing site, API gateway, docs, Storybook, studio, and supporting infra packages scaffolded as one coherent monorepo
- **Verified scaffolding path** — region-aware defaults, template checks, and reproducible project bootstrap instead of hand-assembling a starter stack
- **AI runtime foundation** — provider registry, Vercel AI SDK v5, OpenAI-compatible endpoints, and agent-ready packages wired into the platform baseline
- **Global + China delivery surface** — email, storage, monitoring, analytics, SMS, payments, and CN social login options selected through one scaffolding flow
- **Brand, tenant, and compliance primitives** — white-label branding, multi-tenant foundations, and China-market compliance scaffolding already wired in

## Usage

### Interactive (recommended)

```bash
npx create-sailor@latest
```

Asks just 4 questions: **project name / region / auth / AI providers**. Everything else uses region-aware smart defaults.

### Non-interactive (专家模式)

```bash
npm create sailor@latest my-app \
  --region=cn \
  --auth=clerk \
  --social-login=wechat,dingtalk,feishu \
  --ai=deepseek,qwen,siliconflow \
  --email=aliyun-dm \
  --storage=aliyun-oss \
  --monitoring=sentry \
  --analytics=baidu \
  --sms=aliyun-sms \
  --payment=wechat \
  --deploy=aliyun \
  -y
```

## CLI Flags

| Flag | Values | Default |
|------|--------|---------|
| `--region` | `global` · `cn` · `hybrid` | `global` |
| `--auth` | `clerk` · `betterauth` · `none` | `clerk` |
| `--social-login` | `wechat,qq,dingtalk,workweixin,feishu,weibo` (comma-sep) | none |
| `--payment` | `stripe` · `lemon` · `wechat` · `alipay` · `none` | region-based |
| `--ai` | comma-separated provider ids | `openai` |
| `--email` | `resend` · `postmark` · `ses` · `aliyun-dm` · `tencent-ses` · `netease` · `none` | region-based |
| `--storage` | `r2` · `s3` · `supabase` · `aliyun-oss` · `tencent-cos` · `qiniu` · `none` | region-based |
| `--monitoring` | `sentry` · `datadog` · `aliyun-arms` · `tingyun` · `none` | region-based |
| `--analytics` | `posthog` · `plausible` · `umami` · `baidu` · `sensors` · `none` | region-based |
| `--sms` | `twilio` · `aliyun-sms` · `tencent-sms` · `yunpian` · `none` | region-based |
| `--deploy` | `vercel` · `railway` · `cloudflare` · `selfhost` | `vercel` |
| `--docs` | `fumadocs` · `none` | `fumadocs` |
| `--orm` | `prisma` · `drizzle` · `none` | `prisma` |
| `--db` | `postgres` · `mysql` · `sqlite` · `none` | `postgresql` |
| `--i18n / --no-i18n` | boolean | `true` |
| `-y, --yes` | accept all defaults (non-interactive) | — |
| `--dry-run` | preview actions without writing | — |
| `--json` | machine-readable output | — |

## Region Presets

| Region | Email | Storage | Analytics | Monitoring | SMS | Payment |
|--------|-------|---------|-----------|------------|-----|---------|
| `global` | Resend | R2 | PostHog | Sentry | Twilio | Stripe |
| `cn` | 阿里云邮件推送 | 阿里云 OSS | 百度统计 | Sentry | 阿里云短信 | 微信支付 |
| `hybrid` | Resend | 阿里云 OSS | PostHog | Sentry | 阿里云短信 | Stripe |

## Social login (CN)

Adding `--social-login=wechat,dingtalk` extends your primary auth provider
(Clerk or Better Auth) with China-region OAuth:

- Generates `apps/web/src/app/api/auth/callback/<id>/route.ts` stubs with the
  correct token-exchange endpoints (微信 / QQ / 钉钉 / 企业微信 / 飞书 / 微博)
- Generates `apps/web/src/components/auth/SocialLoginButtons.tsx` with one
  button per selected provider
- Appends all required env vars to `.env.example`

The primary auth provider still owns user/session lifecycle — the generated
callbacks exchange `code` for provider access tokens and leave a
`// TODO: upsert into primary auth` marker for the user to wire up.

## After Scaffolding

```bash
cd my-app
pnpm install
# create .env.local and add your provider credentials
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Useful follow-ups:

```bash
pnpm brand:init
pnpm brand:apply
pnpm generate:api-types
```

## Why Sailor?

Sailor is not a thin starter with a long feature checklist. It is the governed
platform baseline Nebutra uses for AI-native SaaS: auth, billing, branding,
docs, tenant-aware app structure, and AI integration are scaffolded into a
single monorepo you can extend instead of re-assembling from scratch.

## Roadmap

- **Verified scaffolding** — immutable template delivery, scaffold smoke validation, and safer bootstrap defaults
- **Remote feature registry** — `nebutra add` with compatibility checks, provider awareness, and controlled file application
- **Harness runtime** — stronger MCP, agent, and automation primitives for AI-native SaaS workflows
- **Upgrade path** — version-aware migrations, diagnostics, and guided adoption of new platform capabilities

## Documentation

- **Getting Started**: [nebutra.com/docs](https://nebutra.com/docs)
- **White-label Guide**: [nebutra.com/docs/whitelabel](https://nebutra.com/docs/whitelabel)
- **Licensing**: [nebutra.com/licensing](https://nebutra.com/licensing)
- **Get Free License**: [nebutra.com/get-license](https://nebutra.com/get-license)

## License

AGPL-3.0 with a commercial license exception.
See [LICENSE-COMMERCIAL.md](https://github.com/nebutra/nebutra-sailor/blob/main/LICENSE-COMMERCIAL.md) for details.
Commercial and individual licensing details: [get-license](https://nebutra.com/get-license).

---

**Built by [Nebutra](https://nebutra.com)** for teams shipping AI-native products.
