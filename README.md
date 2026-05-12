<div align="right">
  <strong>English</strong> | <a href="README.zh-CN.md">简体中文</a> | <a href="README.ja.md">日本語</a>
</div>

<div align="center">
  <a href="https://nebutra.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/design/brand/assets/logo/logo-inverse.svg" />
      <source media="(prefers-color-scheme: light)" srcset="packages/design/brand/assets/logo/logo-horizontal-en.svg" />
      <img alt="Nebutra" src="packages/design/brand/assets/logo/logo-horizontal-en.svg" width="320" />
    </picture>
  </a>
  <br />
  <br />
  <h3>Open-Source AI-Native SaaS Platform Baseline</h3>
  <p><em>Governed multi-tenant product infrastructure for AI gateways, billing, auth, compliance, and white-label delivery.</em></p>
  <br />
  <p>
    <a href="https://nebutra.com"><strong>Website</strong></a> · 
    <a href="#-introduction"><strong>Introduction</strong></a> · 
    <a href="#-tech-stack"><strong>Tech Stack</strong></a> · 
    <a href="#-getting-started"><strong>Quick Start</strong></a> · 
    <a href="#-contributing"><strong>Contributing</strong></a>
  </p>
  <p>
    <a href="https://github.com/Nebutra/Nebutra-Sailor/stargazers">
      <img src="https://img.shields.io/github/stars/Nebutra/Nebutra-Sailor?style=for-the-badge&logo=github&color=6366f1&logoColor=fff" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/Nebutra/Nebutra-Sailor/network/members">
      <img src="https://img.shields.io/github/forks/Nebutra/Nebutra-Sailor?style=for-the-badge&logo=github&color=14b8a6&logoColor=fff" alt="GitHub Forks" />
    </a>
    <a href="https://github.com/Nebutra/Nebutra-Sailor/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-AGPLv3-6366f1?style=for-the-badge" alt="License" />
    </a>
  </p>
  <p>
    <a href="https://x.com/nebutra">
      <img src="https://img.shields.io/badge/follow-nebutra-18181b?style=flat-square&logo=x&logoColor=fff" alt="X" />
    </a>
  </p>
  <p>
    <a href="https://discord.gg/nebutra">
      <img src="https://img.shields.io/discord/000000000000000000?style=flat-square&logo=discord&color=5865F2&logoColor=fff&label=Discord" alt="Discord" />
    </a>
  </p>
</div>

<br />
<br />

## Introduction

Nebutra Sailor is an enterprise-grade, AI-native SaaS monorepo architecture designed for building governed multi-tenant platforms. It provides a practical baseline for AI gateways, agent workflows, billing, auth, compliance, and white-label product delivery.

Built with Next.js 16, React 19, Prisma 7, and the Vercel AI SDK, Sailor treats AI as a governed runtime surface: provider topology, model routing, observability, tenant isolation, and compliance hooks are part of the platform baseline.

### Brand Vision

Nebula • Nurture • Ultra • Future

- Nebula: Aggregate data, tools, and intelligence into usable products.
- Nurture: Incubate AI-native apps via automated toolchains and “digital employees.”
- Ultra: Ship reliable engineering and value-first outcomes.
- Future: Make AI productivity accessible to everyone.

### About the Company

<div align="center">
  <h4>Nebutra Intelligence</h4>
  <sub>Wuxi Nebutra Intelligence Technology Co., Ltd.</sub>
  <br /><br />
  <p>
    AI-native infrastructure company building governed product baselines<br />
    for multi-tenant SaaS, agent workflows, launch operations, and global delivery
  </p>
  <p align="center">The durable moat is not a starter template. It is the ability to turn changing AI capabilities into governed, shippable systems.</p>
</div>

> AI can help build the demo. Sailor focuses on the harder production layer: governance, security, architecture, scalability, and revenue operations.

<br />

<div align="center">
<table>
<tr>
<td align="center" width="25%">
  <h3>🚀</h3>
  <strong>Global First</strong><br />
  <sub>Day 1 worldwide markets</sub>
</td>
<td align="center" width="25%">
  <h3>🤖</h3>
  <strong>AI-Native</strong><br />
  <sub>LLMs · Multi-Agent · MCP</sub>
</td>
<td align="center" width="25%">
  <h3>💼</h3>
  <strong>Platform Governance</strong><br />
  <sub>Topology · Contracts · CI</sub>
</td>
<td align="center" width="25%">
  <h3>🦄</h3>
  <strong>Launch Infrastructure</strong><br />
  <sub>Auth · Billing · AI Gateway</sub>
</td>
</tr>
</table>
</div>

### Why Sailor?

**For governed AI-native products**: Sailor bridges the gap between _"AI helped me build a demo"_ and _"this is a product platform we can operate, audit, bill, and scale"_.

<table>
<tr>
<td width="50%">

|     | Feature              | Description                            |
| :-: | :------------------- | :------------------------------------- |
| 🚀  | **Production-Ready** | Battle-tested enterprise patterns      |
| 🤖  | **AI-Native**        | LLM · Embeddings · RAG · MCP Agent     |
| 🏢  | **Multi-Tenant**     | RLS · Isolation · Customization        |
| ⚡  | **Modern Stack**     | Next.js 16 · React 19 · TypeScript 5.9 |
| 💳  | **Billing Built-in** | Stripe · Usage metering · Entitlements |

</td>
<td width="50%">

|     | Feature                | Description                      |
| :-: | :--------------------- | :------------------------------- |
| 📋  | **Legal & Compliance** | GDPR/CCPA · Cookie consent       |
| 🔐  | **Security-First**     | WAF · RLS · Prompt injection controls |
| 🌍  | **Global-Ready**       | i18n · CDN · Edge caching        |
| 👤  | **Operator-Ready**     | Multi-Agent · Automated CI/CD    |
| 🚢  | **Launch-Ready**       | Demo → Product → Revenue         |

</td>
</tr>
</table>

## Highlights

<table>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/ai.svg" width="28" alt="AI" /><br />
      <strong>AI‑native</strong>
      <br />LLMs, vector search, MCP agents, and premium Lobe UI Chat interfaces.
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/tenants.svg" width="28" alt="Tenants" /><br />
      <strong>Multi‑tenant by default</strong>
      <br />Tenant context, RLS, scoped caching and rate limits baked in.
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/enterprise.svg" width="28" alt="Enterprise" /><br />
      <strong>Enterprise‑ready</strong>
      <br />Cloudflare WAF/R2, Inngest workflows, Sentry/Otel, Vercel deployments.
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/workflows.svg" width="28" alt="Workflows" /><br />
      <strong>Billing & Monetization</strong>
      <br />Database-driven plans, Stripe billing, usage metering, feature gates.
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/security.svg" width="28" alt="Security" /><br />
      <strong>Security & Compliance</strong>
      <br />RLS, WAF, Turnstile, GDPR/CCPA, cookie consent.
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/toolkit.svg" width="28" alt="Toolkit" /><br />
      <strong>Marketing UI Kit</strong>
      <br />Hero, Features, Pricing, Testimonials — conversion-optimized components.
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/enterprise.svg" width="28" alt="Architecture" /><br />
      <strong>Automated Governance</strong>
      <br />Strict <code>vitest.arch</code> boundaries and semantic token linting.
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/toolkit.svg" width="28" alt="CSS" /><br />
      <strong>Zero-Runtime CSS</strong>
      <br />Pure CSS variables as SSOT. No CSS-in-JS runtime overhead.
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/workflows.svg" width="28" alt="Docker" /><br />
      <strong>Modular Local DX</strong>
      <br />Docker Compose profiles (<code>ai</code>) to boot only what's needed.
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/ai.svg" width="28" alt="AI Agent" /><br />
      <strong>Monetized MCP Registry</strong>
      <br />Native Model Context Protocol with plan-based rate-limits & billing.
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/security.svg" width="28" alt="Saga" /><br />
      <strong>Distributed Saga</strong>
      <br />Native TypeScript orchestrator with automatic transaction rollback.
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/tenants.svg" width="28" alt="Event Bus" /><br />
      <strong>Multi-Tenant Event Bus</strong>
      <br />Tenant-isolated Pub/Sub supporting Fan-out & Request-Reply.
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/workflows.svg" width="28" alt="Monitoring" /><br />
      <strong>Unified Status Aggregation</strong>
      <br />Concurrent checks across 9 services returning a standardized schema for OpenStatus & Atlassian.
    </td>
    <td width="33%" valign="top"></td>
    <td width="33%" valign="top"></td>
  </tr>
</table>

<br />

## Tech Stack

<table>
<tr>
<td><strong>Frontend</strong></td>
<td>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white&v=1" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white&v=1" alt="Tailwind" /></a>
  <a href="https://storybook.js.org/"><img src="https://img.shields.io/badge/Storybook_8-FF4785?style=flat-square&logo=storybook&logoColor=white&v=1" alt="Storybook" /></a>
</td>
</tr>
<tr>
<td><strong>UI / Design</strong></td>
<td>
  <a href="https://www.radix-ui.com/"><img src="https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radix-ui&logoColor=white" alt="Radix UI" /></a>
  <img src="https://img.shields.io/badge/HeroUI-000?style=flat-square" alt="HeroUI" />
  <img src="https://img.shields.io/badge/Lobe_UI-000?style=flat-square&logo=react&logoColor=white&v=1" alt="Lobe UI" />
  <img src="https://img.shields.io/badge/Geist_Icons_(541)-000?style=flat-square" alt="Geist Icons" />
  <img src="https://img.shields.io/badge/Inter-000?style=flat-square&logo=googlefonts&logoColor=white&v=1" alt="Inter" />
  <img src="https://img.shields.io/badge/JetBrains_Mono-000?style=flat-square&logo=jetbrains&logoColor=white&v=1" alt="JetBrains Mono" />
  <img src="https://img.shields.io/badge/W3C_DTCG_Tokens-gray?style=flat-square" alt="DTCG Tokens" />
</td>
</tr>
<tr>
<td><strong>Auth</strong></td>
<td>
  <a href="https://clerk.com/"><img src="https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white&v=1" alt="Clerk" /></a>
  <a href="https://www.better-auth.com/"><img src="https://img.shields.io/badge/Better_Auth-000?style=flat-square" alt="Better Auth" /></a>
  <a href="https://authjs.dev/"><img src="https://img.shields.io/badge/Auth.js-000?style=flat-square&logo=next.js&logoColor=white&v=1" alt="Auth.js" /></a>
  <img src="https://img.shields.io/badge/OIDC_Provider-gray?style=flat-square" alt="OIDC" />
  <img src="https://img.shields.io/badge/Multi--tenant_Orgs-gray?style=flat-square" alt="Multi-tenant" />
</td>
</tr>
<tr>
<td><strong>BFF</strong></td>
<td>
  <a href="https://hono.dev/"><img src="https://img.shields.io/badge/Hono-E36002?style=flat-square&logo=hono&logoColor=white&v=1" alt="Hono" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma_7-2D3748?style=flat-square&logo=prisma&logoColor=white&v=1" alt="Prisma" /></a>
  <a href="https://zod.dev/"><img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white&v=1" alt="Zod" /></a>
</td>
</tr>
<tr>
<td><strong>Backend (Python)</strong></td>
<td>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white&v=1" alt="FastAPI" /></a>
  <a href="https://www.uvicorn.org/"><img src="https://img.shields.io/badge/Uvicorn-499848?style=flat-square" alt="Uvicorn" /></a>
  <a href="https://docs.pydantic.dev/"><img src="https://img.shields.io/badge/Pydantic_v2-E92063?style=flat-square&logo=pydantic&logoColor=white&v=1" alt="Pydantic" /></a>
  <img src="https://img.shields.io/badge/Python_3.11+-3776AB?style=flat-square&logo=python&logoColor=white&v=1" alt="Python" />
</td>
</tr>
<tr>
<td><strong>Database</strong></td>
<td>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white&v=1" alt="Supabase" /></a>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white&v=1" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white&v=1" alt="pgvector" />
  <a href="https://clickhouse.com/"><img src="https://img.shields.io/badge/ClickHouse-FFCC01?style=flat-square&logo=clickhouse&logoColor=black&v=1" alt="ClickHouse" /></a>
  <img src="https://img.shields.io/badge/Realtime-gray?style=flat-square" alt="Realtime" />
  <img src="https://img.shields.io/badge/RLS-gray?style=flat-square" alt="RLS" />
</td>
</tr>
<tr>
<td><strong>Cache / Rate-limit</strong></td>
<td>
  <a href="https://upstash.com/"><img src="https://img.shields.io/badge/Upstash_Redis-00E9A3?style=flat-square&logo=redis&logoColor=white&v=1" alt="Upstash" /></a>
  <img src="https://img.shields.io/badge/Sliding_Window-gray?style=flat-square" alt="Sliding Window" />
  <img src="https://img.shields.io/badge/Token_Bucket-gray?style=flat-square" alt="Token Bucket" />
</td>
</tr>
<tr>
<td><strong>Real-time</strong></td>
<td>
  <a href="https://pusher.com/"><img src="https://img.shields.io/badge/Pusher-300D4F?style=flat-square&logo=pusher&logoColor=white&v=1" alt="Pusher" /></a>
  <a href="https://soketi.app/"><img src="https://img.shields.io/badge/Soketi-4F46E5?style=flat-square" alt="Soketi" /></a>
  <img src="https://img.shields.io/badge/Supabase_Realtime-3ECF8E?style=flat-square" alt="Supabase Realtime" />
</td>
</tr>
<tr>
<td><strong>AI</strong></td>
<td>
  <a href="https://sdk.vercel.ai/"><img src="https://img.shields.io/badge/Vercel_AI_SDK_5-black?style=flat-square&logo=vercel" alt="Vercel AI" /></a>
  <a href="https://vercel.com/ai-gateway"><img src="https://img.shields.io/badge/AI_Gateway-black?style=flat-square&logo=vercel" alt="AI Gateway" /></a>
  <a href="https://openrouter.ai/"><img src="https://img.shields.io/badge/OpenRouter-6366F1?style=flat-square" alt="OpenRouter" /></a>
  <img src="https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white&v=1" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Anthropic-191919?style=flat-square&logo=anthropic&logoColor=white&v=1" alt="Anthropic" />
  <img src="https://img.shields.io/badge/Google_AI-4285F4?style=flat-square&logo=google&logoColor=white&v=1" alt="Google AI" />
  <img src="https://img.shields.io/badge/DeepSeek-1E40AF?style=flat-square" alt="DeepSeek" />
  <img src="https://img.shields.io/badge/Moonshot-000000?style=flat-square" alt="Moonshot" />
  <img src="https://img.shields.io/badge/MCP-black?style=flat-square" alt="MCP" />
  <img src="https://img.shields.io/badge/30+_providers-475569?style=flat-square" alt="30+ providers" />
</td>
</tr>
<tr>
<td><strong>Search</strong></td>
<td>
  <a href="https://www.meilisearch.com/"><img src="https://img.shields.io/badge/Meilisearch-FF5CAA?style=flat-square&logo=meilisearch&logoColor=white&v=1" alt="Meilisearch" /></a>
  <a href="https://typesense.org/"><img src="https://img.shields.io/badge/Typesense-DA1A60?style=flat-square&logo=typesense&logoColor=white&v=1" alt="Typesense" /></a>
  <a href="https://www.algolia.com/"><img src="https://img.shields.io/badge/Algolia-003DFF?style=flat-square&logo=algolia&logoColor=white&v=1" alt="Algolia" /></a>
</td>
</tr>
<tr>
<td><strong>Queue</strong></td>
<td>
  <a href="https://upstash.com/qstash"><img src="https://img.shields.io/badge/QStash-00E9A3?style=flat-square&logo=upstash&logoColor=white&v=1" alt="QStash" /></a>
  <a href="https://docs.bullmq.io/"><img src="https://img.shields.io/badge/BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white&v=1" alt="BullMQ" /></a>
</td>
</tr>
<tr>
<td><strong>Storage / Uploads</strong></td>
<td>
  <a href="https://www.cloudflare.com/products/r2/"><img src="https://img.shields.io/badge/Cloudflare_R2-F38020?style=flat-square&logo=cloudflare&logoColor=white&v=1" alt="R2" /></a>
  <a href="https://aws.amazon.com/s3/"><img src="https://img.shields.io/badge/AWS_S3-569A31?style=flat-square&logo=amazons3&logoColor=white&v=1" alt="S3" /></a>
  <a href="https://vercel.com/docs/storage/vercel-blob"><img src="https://img.shields.io/badge/Vercel_Blob-black?style=flat-square&logo=vercel" alt="Vercel Blob" /></a>
  <img src="https://img.shields.io/badge/Multipart-gray?style=flat-square" alt="Multipart" />
  <img src="https://img.shields.io/badge/Presigned_URLs-gray?style=flat-square" alt="Presigned URLs" />
</td>
</tr>
<tr>
<td><strong>Notifications</strong></td>
<td>
  <a href="https://novu.co/"><img src="https://img.shields.io/badge/Novu-4F46E5?style=flat-square" alt="Novu" /></a>
  <img src="https://img.shields.io/badge/In--app-gray?style=flat-square" alt="In-app" />
  <img src="https://img.shields.io/badge/Email-gray?style=flat-square" alt="Email" />
  <img src="https://img.shields.io/badge/Push-gray?style=flat-square" alt="Push" />
  <img src="https://img.shields.io/badge/SMS-gray?style=flat-square" alt="SMS" />
</td>
</tr>
<tr>
<td><strong>Webhooks</strong></td>
<td>
  <a href="https://www.svix.com/"><img src="https://img.shields.io/badge/Svix-1F2937?style=flat-square" alt="Svix" /></a>
  <img src="https://img.shields.io/badge/HMAC_Signing-gray?style=flat-square" alt="HMAC" />
  <img src="https://img.shields.io/badge/Retry_+_DLQ-gray?style=flat-square" alt="Retry + DLQ" />
</td>
</tr>
<tr>
<td><strong>SMS (CN)</strong></td>
<td>
  <img src="https://img.shields.io/badge/Aliyun_SMS-FF6A00?style=flat-square&logo=alibabacloud&logoColor=white&v=1" alt="Aliyun" />
  <img src="https://img.shields.io/badge/Tencent_Cloud-006EFF?style=flat-square&logo=tencentqq&logoColor=white&v=1" alt="Tencent" />
</td>
</tr>
<tr>
<td><strong>Payments</strong></td>
<td>
  <a href="https://stripe.com/"><img src="https://img.shields.io/badge/Stripe-008CDD?style=flat-square&logo=stripe&logoColor=white&v=1" alt="Stripe" /></a>
  <img src="https://img.shields.io/badge/Usage_Metering-gray?style=flat-square" alt="Metering" />
  <img src="https://img.shields.io/badge/Entitlements-gray?style=flat-square" alt="Entitlements" />
</td>
</tr>
<tr>
<td><strong>Email</strong></td>
<td>
  <a href="https://resend.com/"><img src="https://img.shields.io/badge/Resend-black?style=flat-square&logo=resend&logoColor=white&v=1" alt="Resend" /></a>
  <a href="https://react.email/"><img src="https://img.shields.io/badge/React_Email-61DAFB?style=flat-square&logo=react&logoColor=black&v=1" alt="React Email" /></a>
</td>
</tr>
<tr>
<td><strong>CMS / Docs</strong></td>
<td>
  <a href="https://www.sanity.io/"><img src="https://img.shields.io/badge/Sanity_Studio_v4-F03E2F?style=flat-square&logo=sanity&logoColor=white&v=1" alt="Sanity" /></a>
  <a href="https://fumadocs.vercel.app/"><img src="https://img.shields.io/badge/Fumadocs-000?style=flat-square" alt="Fumadocs" /></a>
  <a href="https://mintlify.com/"><img src="https://img.shields.io/badge/Mintlify-1D40AF?style=flat-square" alt="Mintlify" /></a>
</td>
</tr>
<tr>
<td><strong>Design Sync</strong></td>
<td>
  <a href="https://figma.com/"><img src="https://img.shields.io/badge/Figma-F24E1E?style=flat-square&logo=figma&logoColor=white&v=1" alt="Figma" /></a>
  <a href="https://penpot.app/"><img src="https://img.shields.io/badge/Penpot-1A1A1A?style=flat-square" alt="Penpot" /></a>
</td>
</tr>
<tr>
<td><strong>CDN / Security</strong></td>
<td>
  <a href="https://cloudflare.com/"><img src="https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white&v=1" alt="Cloudflare" /></a>
  <img src="https://img.shields.io/badge/WAF-gray?style=flat-square" alt="WAF" />
  <img src="https://img.shields.io/badge/Turnstile-gray?style=flat-square" alt="Turnstile" />
  <img src="https://img.shields.io/badge/CASL_Permissions-gray?style=flat-square" alt="CASL" />
  <img src="https://img.shields.io/badge/KMS_Vault-gray?style=flat-square" alt="Vault" />
</td>
</tr>
<tr>
<td><strong>Workflows</strong></td>
<td>
  <a href="https://www.inngest.com/"><img src="https://img.shields.io/badge/Inngest-6366F1?style=flat-square" alt="Inngest" /></a>
  <a href="https://n8n.io/"><img src="https://img.shields.io/badge/n8n-EA4B71?style=flat-square&logo=n8n&logoColor=white&v=1" alt="n8n" /></a>
  <img src="https://img.shields.io/badge/Saga_Orchestrator-gray?style=flat-square" alt="Saga" />
</td>
</tr>
<tr>
<td><strong>Analytics</strong></td>
<td>
  <a href="https://dub.co/"><img src="https://img.shields.io/badge/Dub-000000?style=flat-square" alt="Dub" /></a>
  <img src="https://img.shields.io/badge/Link_Attribution-gray?style=flat-square" alt="Link Attribution" />
  <img src="https://img.shields.io/badge/Conversions-gray?style=flat-square" alt="Conversions" />
</td>
</tr>
<tr>
<td><strong>Observability</strong></td>
<td>
  <a href="https://sentry.io/"><img src="https://img.shields.io/badge/Sentry-362D59?style=flat-square&logo=sentry&logoColor=white&v=1" alt="Sentry" /></a>
  <a href="https://opentelemetry.io/"><img src="https://img.shields.io/badge/OpenTelemetry-425CC7?style=flat-square&logo=opentelemetry&logoColor=white&v=1" alt="OpenTelemetry" /></a>
  <a href="https://www.openstatus.dev/"><img src="https://img.shields.io/badge/OpenStatus-000?style=flat-square" alt="OpenStatus" /></a>
</td>
</tr>
<tr>
<td><strong>Build / Deploy</strong></td>
<td>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-black?style=flat-square&logo=vercel" alt="Vercel" /></a>
  <a href="https://turbo.build/"><img src="https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white&v=1" alt="Turborepo" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm_10-F69220?style=flat-square&logo=pnpm&logoColor=white&v=1" alt="pnpm" /></a>
  <a href="https://biomejs.dev/"><img src="https://img.shields.io/badge/Biome-60A5FA?style=flat-square&logo=biome&logoColor=white&v=1" alt="Biome" /></a>
</td>
</tr>
</table>

<br />

## Platform Capabilities

Sailor is **provider-agnostic**: every platform package below auto-detects its backend from environment variables, so customers swap providers without changing application code. Each package ships an in-memory implementation for tests and a strict TypeScript contract enforced by architecture tests under [tests/architecture/](tests/architecture/).

<table>
<tr><th>Capability</th><th>Package</th><th>Providers (auto-detected)</th></tr>
<tr><td>Authentication</td><td><code>@nebutra/auth</code></td><td>Clerk · Better Auth · Auth.js</td></tr>
<tr><td>Identity Provider</td><td><code>@nebutra/oauth-server</code></td><td>OIDC (oidc-provider) · Redis-backed sessions</td></tr>
<tr><td>Permissions</td><td><code>@nebutra/permissions</code></td><td>CASL — RBAC + ABAC, Hono middleware, React <code>&lt;Can /&gt;</code></td></tr>
<tr><td>Multi-tenancy</td><td><code>@nebutra/tenant</code></td><td>AsyncLocalStorage context · Prisma RLS bridge</td></tr>
<tr><td>Captcha</td><td><code>@nebutra/captcha</code></td><td>Cloudflare Turnstile</td></tr>
<tr><td>Vault (secrets)</td><td><code>@nebutra/vault</code></td><td>AWS KMS envelope · local HKDF (dev)</td></tr>
<tr><td>Audit log</td><td><code>@nebutra/audit</code></td><td>Append-only with hash chain</td></tr>
<tr><td>Cache</td><td><code>@nebutra/cache</code></td><td>Upstash Redis · in-memory</td></tr>
<tr><td>Rate limit</td><td><code>@nebutra/rate-limit</code></td><td>Sliding window · token bucket (Upstash)</td></tr>
<tr><td>Queue</td><td><code>@nebutra/queue</code></td><td>QStash · BullMQ · in-memory</td></tr>
<tr><td>Search</td><td><code>@nebutra/search</code></td><td>Meilisearch · Typesense · Algolia</td></tr>
<tr><td>Storage / Uploads</td><td><code>@nebutra/uploads</code></td><td>Cloudflare R2 · AWS S3 · Vercel Blob · local FS</td></tr>
<tr><td>Notifications</td><td><code>@nebutra/notifications</code></td><td>Novu — in-app · email · push · SMS · chat</td></tr>
<tr><td>Webhooks</td><td><code>@nebutra/webhooks</code></td><td>Svix · custom HMAC delivery</td></tr>
<tr><td>SMS (CN)</td><td><code>@nebutra/sms</code></td><td>Aliyun · Tencent Cloud</td></tr>
<tr><td>Email</td><td><code>@nebutra/email</code></td><td>Resend + React Email templates</td></tr>
<tr><td>Billing</td><td><code>@nebutra/billing</code></td><td>Stripe — subscriptions, usage, entitlements</td></tr>
<tr><td>Metering</td><td><code>@nebutra/metering</code></td><td>ClickHouse real-time aggregation</td></tr>
<tr><td>Event bus</td><td><code>@nebutra/event-bus</code></td><td>Multi-tenant Pub/Sub · Fan-out · Request-Reply</td></tr>
<tr><td>Saga orchestrator</td><td><code>@nebutra/saga</code></td><td>Native TS workflows with auto-rollback compensations</td></tr>
<tr><td>Feature flags</td><td><code>@nebutra/feature-flags</code></td><td>Database-backed with env-driven overrides</td></tr>
<tr><td>Design tokens</td><td><code>@nebutra/design-sync</code></td><td>W3C DTCG ↔ Figma · Penpot · git-only</td></tr>
<tr><td>Status aggregation</td><td><code>@nebutra/status</code></td><td>OpenStatus · Atlassian StatusPage</td></tr>
</table>

<br />

## Project Structure

```
Nebutra-Sailor/
├── apps/                      # User-facing apps (Next.js)
│   ├── landing-page/      # Marketing site (nebutra.com)
│   ├── web/               # Main SaaS dashboard (app.nebutra.com)
│   ├── studio/            # Sanity CMS (studio.nebutra.com)
│   ├── design-docs/       # Component documentation (Fumadocs)
│   ├── sailor-docs/       # Public product docs (docs.nebutra.com)
│   ├── idp/               # Identity provider service (OAuth 2.0 / OIDC)
│   ├── storybook/         # Component playground
│   ├── mail-preview/      # Email template preview
│   ├── sleptons/          # Sleptons companion app
│   └── tsekaluk-dev/      # Author dev playground
├── packages/                  # Shared TS libraries (categorized in W3b)
│   ├── ai/                # 3 pkgs — agents, ai-providers, mcp
│   ├── commerce/          # 7 pkgs — billing, contracts, marketing, metering, license, legal, waitlist
│   ├── design/            # 7 pkgs — ui, tokens, brand, theme, icons, design-tokens, design-sync
│   ├── iam/               # 8 pkgs — auth, audit, vault, oauth-server, permissions, tenant, identity, captcha
│   ├── integrations/      # 11 pkgs — queue, search, email, notifications, storage, webhooks, cache, sms, uploads, event-bus, saga
│   ├── ops/               # 6 pkgs — cli, create-sailor, preset, sanity, supabase, china-compliance
│   └── platform/          # 13 pkgs — db, logger, rate-limit, feature-flags, gateway-core, errors, config, health, status, alerting, analytics, repositories, i18n
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
├── workflows/                 # Event-driven business workflows (extracted in W2.3)
│   ├── inngest/               # Serverless background jobs + cron
│   ├── n8n/                   # Visual workflow automation
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
  <a href="apps/design-docs/">Design System Docs</a> (Fumadocs)
</td>
</tr>
<tr>
<td><strong>Infrastructure</strong></td>
<td>
  <a href="infra/runtime/docker/">Docker</a> · 
  <a href="infra/iac/k8s/">Kubernetes</a> · 
  <a href="infra/iac/terraform/">Terraform</a> · 
  <a href="workflows/inngest/">Inngest</a> · 
  <a href="workflows/n8n/">n8n</a> · 
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
| [`create-sailor`](https://www.npmjs.com/package/create-sailor) | Bootstrap a new Nebutra Sailor project with region-aware defaults and topology-first AI gateway setup. |
| [`nebutra`](https://www.npmjs.com/package/nebutra) | Operate an existing project: feature registry installs, AI provider governance, gateway routing, schemas, and diagnostics. |

### nebutra.com

[`nebutra.com`](https://nebutra.com) is the public product surface for Nebutra Sailor and the place where we dogfood the platform ourselves. We will use it to publish product updates, commercial licensing, hosted capabilities, launch workflows, and real examples built on this monorepo.

<br />

## Getting Started

### Prerequisites

<table>
<tr><td><strong>Node.js</strong></td><td><code>v22+</code></td></tr>
<tr><td><strong>pnpm</strong></td><td><code>v10.32+</code></td></tr>
<tr><td><strong>Python</strong></td><td><code>3.11+</code> <sub>(for microservices)</sub></td></tr>
</table>

### Quick Start

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

## License

This project is licensed under the **AGPLv3**.

### What this means:

|                        |                                                            |
| ---------------------- | ---------------------------------------------------------- |
| **Free to use**        | Personal projects, learning, internal tools                |
| **Free to modify**     | Create derivative works                                    |
| **Free to distribute** | With attribution                                           |
| **Commercial use**     | Requires open source                                       |
| **Exemption**          | Wuxi Nebutra Intelligence Technology Co., Ltd. and affiliates |

For commercial licensing inquiries, please contact us.

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
    <a href="https://discord.gg/nebutra">Discord</a>
  </p>
  <p>
    <a href="mailto:contact@nebutra.com">Contact</a>
  </p>
</div>
