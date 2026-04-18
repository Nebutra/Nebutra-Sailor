# create-sailor

> AI-Native SaaS unicorn template — 领先的 AI SaaS 独角兽模板 + OPC（一人公司）创新创业生态社区脚手架。

[![npm version](https://img.shields.io/npm/v/create-sailor.svg?color=0033FE)](https://www.npmjs.com/package/create-sailor)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-0033FE.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Commercial License](https://img.shields.io/badge/Commercial-Free%20for%20OPC-0BF1C3.svg)](https://nebutra.com/licensing)

## Quick Start

```bash
# npm
npm create sailor@latest

# pnpm
pnpm create sailor@latest

# bun
bun create sailor
```

## What You Get

- **8 apps + 54 packages + 9 microservices** — landing · dashboard · docs · storybook · api-gateway · community · IDP · studio + Python AI/ML workloads
- **AI-native** — 20+ provider registry, Vercel AI SDK v5, custom OpenAI-compatible endpoints, Multi-Agent orchestration
- **Dual-track: 海外 + 国内 双生态开箱即用**
  - **Email**: Resend / Postmark / AWS SES / 阿里云邮件推送 / 腾讯云 SES / 网易企业邮箱
  - **Storage**: R2 / S3 / Supabase / 阿里云 OSS / 腾讯云 COS / 七牛
  - **Monitoring**: Sentry / Datadog / 阿里云 ARMS / 听云
  - **Analytics**: PostHog / Plausible / Umami / 百度统计 / 神策 / GrowingIO
  - **SMS**: Twilio / 阿里云短信 / 腾讯云短信 / 云片
  - **Payment**: Stripe / Lemon Squeezy / 微信支付 / 支付宝
  - **Social login (CN)**: 微信开放平台 · QQ · 钉钉 · 企业微信 · 飞书 · 微博
- **中国合规套件**: ICP 备案 · 公安备案 · Cookie 弹窗 · AIGC 算法备案声明 · 隐私政策模板
- **White-label**: `brand.config.ts` 一键换品牌（colors · domains · logos · SEO）
- **AGPL-3.0 + Commercial Exception**（Individual / OPC 免费）

## Usage

### Interactive (recommended)

```bash
npm create sailor@latest
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
pnpm dev
```

## Why Sailor?

Unlike generic SaaS starters, **Sailor is both a template and a community** — you
build your product with it, and you join the OPC creator network in the
process.

## Roadmap

- ✅ **v1.0** — Core scaffolding with cfonts banner + full CLI UX
- ✅ **v1.1** — Fumadocs integration + AI Provider registry
- ✅ **v1.2** — All flags working end-to-end
- ✅ **v1.3** — Region-aware defaults + 双生态 providers + 合规套件 + CN social login
- 🔜 **v1.4** — `sailor add <feature>` with remote registry
- 🔜 **v1.5** — Interactive AI Welcome page with onboarding assistant

## Documentation

- **Getting Started**: [nebutra.com/docs](https://nebutra.com/docs)
- **White-label Guide**: [nebutra.com/docs/whitelabel](https://nebutra.com/docs/whitelabel)
- **Licensing**: [nebutra.com/licensing](https://nebutra.com/licensing)
- **Get Free License**: [nebutra.com/get-license](https://nebutra.com/get-license)

## License

AGPL-3.0 with Commercial License Exception for Individual / OPC use.
See [LICENSE-COMMERCIAL.md](https://github.com/nebutra/nebutra-sailor/blob/main/LICENSE-COMMERCIAL.md) for details.
Free for Individual / OPC: [get-license](https://nebutra.com/get-license).

---

**Made with ♥ by [Nebutra](https://nebutra.com)** — Vibe Business for the AI-native era.
