<div align="right">
  <strong>English</strong> | <a href="README.zh-CN.md">简体中文</a> | <a href="README.ja.md">日本語</a>
</div>

<div align="center">
  <a href="https://{{domains.landing}}">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/design/brand/assets/logo/logo-inverse.svg" />
      <source media="(prefers-color-scheme: light)" srcset="packages/design/brand/assets/logo/logo-horizontal-en.svg" />
      <img alt="{{brand.name}}" src="packages/design/brand/assets/logo/logo-horizontal-en.svg" width="320" />
    </picture>
  </a>
  <br />
  <br />
  <h3>{{brand.tagline}}</h3>
  <br />
  <p>
    <a href="https://{{domains.landing}}"><strong>Website</strong></a> · 
    <a href="#introduction"><strong>Introduction</strong></a> · 
    <a href="#tech-stack"><strong>Tech Stack</strong></a> · 
    <a href="#getting-started"><strong>Quick Start</strong></a> · 
    <a href="#contributing"><strong>Contributing</strong></a>
  </p>
  <p>
    <a href="https://github.com/{{repo.full}}/stargazers">
      <img src="https://img.shields.io/github/stars/{{repo.full}}?style=for-the-badge&logo=github&color=6366f1&logoColor=fff" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/{{repo.full}}/network/members">
      <img src="https://img.shields.io/github/forks/{{repo.full}}?style=for-the-badge&logo=github&color=14b8a6&logoColor=fff" alt="GitHub Forks" />
    </a>
    <a href="https://github.com/{{repo.full}}/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/license-AGPLv3-6366f1?style=for-the-badge" alt="License" />
    </a>
  </p>
</div>

<br />
<br />

## Introduction

{{brand.name}} is an enterprise-grade, AI-native SaaS monorepo architecture designed for building modern multi-tenant platforms. It provides a battle-tested foundation for content communities, recommendation systems, e-commerce integrations, and Web3 applications.

Built with the latest technologies including Next.js 16, React 19, and Prisma 7, it embraces an "AI-first" philosophy with native support for LLMs, vector search, and intelligent workflows.

### Brand Vision

{{brand.vision}}

### Why {{brand.name}}?

**For the Vibe Business era**: {{brand.name}} bridges the gap between _"I can build it with AI"_ and _"I can ship a profitable product"_.

> **Vibe Coding** solves the problem of _building it_; **Vibe Business** solves the problem of _making it profitable_.
>
> Going from 0 to 90 is easy—AI handles the coding. The real challenge is the last 10%: security, architecture, scalability, and turning a demo into a product that generates revenue.
>
> **Growth Hacking** meets **AI-Native**: Data-driven experimentation, viral loops, and conversion optimization—now supercharged by intelligent automation.

- **🚀 Production-Ready** — Battle-tested architecture patterns used in real enterprise deployments
- **🤖 AI-Native** — Built-in support for LLMs, Multi-Agent, and AI agents via MCP
- **🏢 Multi-Tenant** — Row-level security, tenant isolation, and per-tenant customization out of the box
- **⚡ Modern Stack** — Next.js 16, React 19, TypeScript 5.6+, TailwindCSS 4.0
- **💳 Billing Built-in** — Database-driven plans, Stripe integration, usage metering, and feature entitlements
- **📋 Legal & Compliance** — Cookie consent, privacy controls, GDPR/CCPA compliance infrastructure
- **🔐 Security-First** — WAF, RLS, Prompt Injection protection built-in
- **🌍 Global-Ready** — i18n, CDN, edge caching, and multi-region deployment support
- **👤 One-Person Ready** — Multi-Agent workflows and automated CI/CD for solo founders
- **🦄 For Unicorns** — Demo → Product → Revenue patterns that balance velocity with reliability

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
      <br />Docker Compose profiles (<code>ai</code>, <code>recsys</code>) to boot only what's needed.
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
<td><strong>Backend (Python)</strong></td>
<td>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white&v=1" alt="FastAPI" /></a>
  <a href="https://www.uvicorn.org/"><img src="https://img.shields.io/badge/Uvicorn-499848?style=flat-square" alt="Uvicorn" /></a>
  <a href="https://docs.pydantic.dev/"><img src="https://img.shields.io/badge/Pydantic_v2-E92063?style=flat-square&logo=pydantic&logoColor=white&v=1" alt="Pydantic" /></a>
  <img src="https://img.shields.io/badge/Python_3.11+-3776AB?style=flat-square&logo=python&logoColor=white&v=1" alt="Python" />
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

{{brand.name}} is **provider-agnostic**: every platform package below auto-detects its backend from environment variables, so customers swap providers without changing application code. Each package ships an in-memory implementation for tests and a strict TypeScript contract enforced by architecture tests under [tests/architecture/](tests/architecture/).

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

## Getting Started

### Prerequisites

| Tool    | Version                                |
| ------- | -------------------------------------- |
| Node.js | `v20+`                                 |
| pnpm    | `v9+`                                  |
| Python  | `3.11+` <sub>(for microservices)</sub> |

### Quick Start

```bash
# Clone the repository
git clone https://github.com/{{repo.full}}.git
cd {{repo.name}}

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

## Project Structure

```
{{repo.name}}/
├── apps/
│   ├── landing-page/      # Marketing site
│   ├── web/               # Main SaaS dashboard
│   ├── studio/            # Sanity CMS
│   └── api-gateway/       # BFF layer
├── packages/
│   ├── marketing/         # Conversion-optimized UI (Waitlist, Pricing, FAQ)
│   ├── ai-providers/      # Multi-provider AI SDK (OpenRouter, OpenAI, etc)
│   ├── billing/           # Stripe billing, plans, usage metering
│   ├── brand/             # Brand assets, guidelines & programmatic tokens
│   ├── design-system/     # Design tokens, marketing themes, Primer base
│   ├── legal/             # Cookie consent, privacy, GDPR/CCPA compliance
│   ├── ui/                # Lobe UI + Lobe Icons + Design System
│   ├── db/                # Prisma 7 schema & client
│   ├── supabase/          # Supabase Realtime, Storage, Edge Functions
│   ├── sanity/            # Sanity CMS client & schemas
│   ├── captcha/           # Cloudflare Turnstile integration
│   ├── storage/           # R2/S3 storage client
│   ├── cache/             # Redis caching strategies
│   ├── rate-limit/        # Multi-tenant rate limiting
│   ├── event-bus/         # Cross-service messaging
│   ├── saga/              # Distributed transactions
│   ├── mcp/               # Model Context Protocol for AI agents
│   ├── config/            # Shared configuration utilities
│   ├── errors/            # Standardized error handling
│   ├── feature-flags/     # Feature flag management
│   ├── alerting/          # Multi-channel alerting
│   ├── audit/             # Compliance audit logging
│   ├── health/            # Health check utilities
│   ├── status/            # OpenStatus integration
│   └── analytics/         # Dub-powered link tracking & conversions
├── services/
│   ├── ai/                # Python FastAPI - LLM, embeddings
│   ├── content/           # Python FastAPI - posts, feed
│   ├── recsys/            # Python - recommendation engine
│   ├── ecommerce/         # Python - Shopify/Shopline sync
│   └── web3/              # Python - blockchain indexer
├── infra/
│   ├── cloudflare/        # CDN, WAF, R2 configs
│   ├── docker/            # Container configurations
│   ├── k8s/               # Kubernetes manifests
│   ├── railway/           # Railway deployment
│   ├── terraform/         # IaC configurations
│   ├── inngest/           # TypeScript workflow definitions
│   ├── n8n/               # Visual workflow automation
│   ├── pusher/            # Real-time communication (Pusher/Soketi)
│   └── observability/     # Logging, tracing, metrics
└── docs/                  # Architecture documentation
```

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

We welcome contributions of all kinds.

|                      |                                                          |
| -------------------- | -------------------------------------------------------- |
| **Report Bugs**      | [Open an issue](https://github.com/{{repo.full}}/issues) |
| **Feature Requests** | Suggest via issues                                       |
| **Pull Requests**    | Submit PRs for features or fixes                         |

<br />

## License

**AGPLv3**

|                        |                                             |
| ---------------------- | ------------------------------------------- |
| **Free to use**        | Personal projects, learning, internal tools |
| **Free to modify**     | Create derivative works                     |
| **Free to distribute** | With attribution                            |
| **Commercial use**     | Requires open source                        |
| **Exemption**          | {{license.commercialExempt}}                |

<br />

---

<br />

<div align="center">
  <a href="https://{{domains.landing}}">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/design/brand/assets/logo/logo-inverse.svg" width="100">
      <source media="(prefers-color-scheme: light)" srcset="packages/design/brand/assets/logo/logo-mono.svg" width="100">
      <img alt="{{brand.name}}" src="packages/design/brand/assets/logo/logo-mono.svg" width="100">
    </picture>
  </a>
  <br />
  <br />
  <sub>
    <strong>Shipping the future, one commit at a time.</strong>
  </sub>
  <br />
  <br />
  <sub>© {{company.year}}-present {{company.name}}</sub>
</div>
