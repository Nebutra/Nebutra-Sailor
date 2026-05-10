<div align="right">
  <a href="README.md">English</a> | <strong>简体中文</strong> | <a href="README.ja.md">日本語</a>
</div>

<div align="center">
  <a href="https://{{domains.landing}}">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/design/brand/assets/logo/logo-inverse.svg" />
      <source media="(prefers-color-scheme: light)" srcset="packages/design/brand/assets/logo/logo-horizontal-zh.svg" />
      <img alt="{{brand.name}}" src="packages/design/brand/assets/logo/logo-horizontal-zh.svg" width="320" />
    </picture>
  </a>
  <br />
  <br />
  <h3>{{brand.tagline}}</h3>
  <br />
  <p>
    <a href="https://{{domains.landing}}"><strong>官网</strong></a> · 
    <a href="#简介"><strong>简介</strong></a> · 
    <a href="#技术栈"><strong>技术栈</strong></a> · 
    <a href="#快速开始"><strong>快速开始</strong></a> · 
    <a href="#参与贡献"><strong>贡献</strong></a>
  </p>
  <p>
    <a href="https://github.com/{{repo.full}}/stargazers">
      <img src="https://img.shields.io/github/stars/{{repo.full}}?style=for-the-badge&logo=github&color=6366f1&logoColor=fff" alt="GitHub Stars" />
    </a>
    <a href="https://github.com/{{repo.full}}/network/members">
      <img src="https://img.shields.io/github/forks/{{repo.full}}?style=for-the-badge&logo=github&color=14b8a6&logoColor=fff" alt="GitHub Forks" />
    </a>
    <a href="https://github.com/{{repo.full}}/blob/main/LICENSE">
      <img src="https://img.shields.io/badge/许可证-AGPLv3-6366f1?style=for-the-badge" alt="License" />
    </a>
  </p>
</div>

<br />
<br />

## 简介

{{brand.name}} 是一个企业级、AI 原生的 SaaS 单体仓库架构，专为构建现代多租户平台而设计。它为内容社区、推荐系统、电商集成和 Web3 应用提供了经过实战检验的基础设施。

采用最新技术栈构建，包括 Next.js 16、React 19 和 Prisma 7，秉承「AI 优先」的理念，原生支持大语言模型、向量搜索和智能工作流。

### 品牌愿景

{{brand.vision}}

### 为什么选择 {{brand.name}}？

**面向 Vibe Business 时代**：{{brand.name}} 填补了「我能用 AI 做出来」和「我能交付一个盈利产品」之间的鸿沟。

> **Vibe Coding** 解决「做出来」的问题；**Vibe Business** 解决「赚到钱」的问题。
>
> 从 0 到 90 很容易——AI 帮你写代码。真正的挑战在最后 10%：安全、架构、可扩展性，以及把 Demo 变成能产生收入的产品。
>
> **增长黑客** × **AI 原生**：数据驱动实验、病毒循环、转化优化——现在由智能自动化全面加速。

- **🚀 生产就绪** — 经过实际企业部署验证的架构模式
- **🤖 AI 原生** — 内置 LLM、Multi-Agent、MCP 支持
- **🏢 多租户** — 开箱即用的行级安全、租户隔离和租户定制
- **⚡ 现代技术栈** — Next.js 16、React 19、TypeScript 5.6+、TailwindCSS 4.0
- **💳 计费内置** — 数据库驱动的计划配置、Stripe 计费、用量计量、功能权限
- **📋 合规基础设施** — Cookie 同意、隐私控制、GDPR/CCPA 合规基础设施
- **🔐 安全优先** — WAF、RLS、Prompt Injection 防护
- **🌍 全球化** — 国际化、CDN、边缘缓存、多区域部署支持
- **👤 一人公司 Ready** — Multi-Agent 工作流、自动化 CI/CD
- **🦄 面向独角兽** — Demo → 产品 → 收入，兼顾速度与可靠性

## 亮点

<table>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/ai.svg" width="28" alt="AI" /><br />
      <strong>AI 原生</strong>
      <br />内置 LLM、向量检索、MCP Agents，以及高级的 Lobe UI 聊天体验。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/tenants.svg" width="28" alt="Tenants" /><br />
      <strong>多租户为先</strong>
      <br />租户上下文、RLS、缓存与限流按租户隔离。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/enterprise.svg" width="28" alt="Enterprise" /><br />
      <strong>企业级工程</strong>
      <br />Cloudflare WAF/R2、Inngest 工作流、Sentry/Otel、Vercel 部署。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/workflows.svg" width="28" alt="Workflows" /><br />
      <strong>计费与变现</strong>
      <br />数据库驱动计划、Stripe 计费、用量计量、功能门控。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/security.svg" width="28" alt="Security" /><br />
      <strong>安全与合规</strong>
      <br />RLS、WAF、Turnstile、GDPR/CCPA、Cookie 同意。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/toolkit.svg" width="28" alt="Toolkit" /><br />
      <strong>营销 UI 套件</strong>
      <br />Hero、Features、Pricing、Testimonials 等转化优化组件。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/enterprise.svg" width="28" alt="Architecture" /><br />
      <strong>自动化架构治理</strong>
      <br />内置 <code>vitest.arch</code> 边界测试与严格的语义化 Token 校验。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/toolkit.svg" width="28" alt="CSS" /><br />
      <strong>零运行时 CSS</strong>
      <br />纯 CSS 变量作为 SSOT，彻底抛弃 CSS-in-JS 性能损耗。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/workflows.svg" width="28" alt="Docker" /><br />
      <strong>按需模块化 DX</strong>
      <br />配置文件隔离，本地开发仅需按需启动核心微服务。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/ai.svg" width="28" alt="AI Agent" /><br />
      <strong>自带商业化 MCP 网关</strong>
      <br />基于订阅计划的 Model Context Protocol 访问控制与审计额度。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/security.svg" width="28" alt="Saga" /><br />
      <strong>分布式 Saga 编排器</strong>
      <br />纯 TypeScript 编排机制，自带事务失败自动回滚与补偿。
    </td>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/tenants.svg" width="28" alt="Event Bus" /><br />
      <strong>多租户事件总线隔离</strong>
      <br />强制 <code>tenantId</code> 隔离，原生支持异步广播与同步等待流。
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/design/brand/assets/icons/workflows.svg" width="28" alt="Monitoring" /><br />
      <strong>多端监控集成网关</strong>
      <br />单节点并发检测 9 个微服务及组件，提供 OpenStatus 与 Atlassian Statuspage 的标准化遥测。
    </td>
    <td width="33%" valign="top"></td>
    <td width="33%" valign="top"></td>
  </tr>
</table>

<br />

## 技术栈

<table>
<tr>
<td><strong>前端</strong></td>
<td>
  <a href="https://nextjs.org/"><img src="https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js" alt="Next.js" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white&v=1" alt="TypeScript" /></a>
  <a href="https://tailwindcss.com/"><img src="https://img.shields.io/badge/Tailwind_4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white&v=1" alt="Tailwind" /></a>
  <a href="https://storybook.js.org/"><img src="https://img.shields.io/badge/Storybook_8-FF4785?style=flat-square&logo=storybook&logoColor=white&v=1" alt="Storybook" /></a>
</td>
</tr>
<tr>
<td><strong>UI / 设计</strong></td>
<td>
  <a href="https://www.radix-ui.com/"><img src="https://img.shields.io/badge/Radix_UI-161618?style=flat-square&logo=radix-ui&logoColor=white" alt="Radix UI" /></a>
  <img src="https://img.shields.io/badge/HeroUI-000?style=flat-square" alt="HeroUI" />
  <img src="https://img.shields.io/badge/Lobe_UI-000?style=flat-square&logo=react&logoColor=white&v=1" alt="Lobe UI" />
  <img src="https://img.shields.io/badge/Geist_Icons_(541)-000?style=flat-square" alt="Geist Icons" />
  <img src="https://img.shields.io/badge/Inter-000?style=flat-square&logo=googlefonts&logoColor=white&v=1" alt="Inter" />
  <img src="https://img.shields.io/badge/JetBrains_Mono-000?style=flat-square&logo=jetbrains&logoColor=white&v=1" alt="JetBrains Mono" />
  <img src="https://img.shields.io/badge/W3C_DTCG_令牌-gray?style=flat-square" alt="DTCG Tokens" />
</td>
</tr>
<tr>
<td><strong>认证</strong></td>
<td>
  <a href="https://clerk.com/"><img src="https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white&v=1" alt="Clerk" /></a>
  <a href="https://www.better-auth.com/"><img src="https://img.shields.io/badge/Better_Auth-000?style=flat-square" alt="Better Auth" /></a>
  <a href="https://authjs.dev/"><img src="https://img.shields.io/badge/Auth.js-000?style=flat-square&logo=next.js&logoColor=white&v=1" alt="Auth.js" /></a>
  <img src="https://img.shields.io/badge/OIDC_提供商-gray?style=flat-square" alt="OIDC" />
  <img src="https://img.shields.io/badge/多租户组织-gray?style=flat-square" alt="Multi-tenant" />
</td>
</tr>
<tr>
<td><strong>BFF 层</strong></td>
<td>
  <a href="https://hono.dev/"><img src="https://img.shields.io/badge/Hono-E36002?style=flat-square&logo=hono&logoColor=white&v=1" alt="Hono" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma_7-2D3748?style=flat-square&logo=prisma&logoColor=white&v=1" alt="Prisma" /></a>
  <a href="https://zod.dev/"><img src="https://img.shields.io/badge/Zod-3E67B1?style=flat-square&logo=zod&logoColor=white&v=1" alt="Zod" /></a>
</td>
</tr>
<tr>
<td><strong>后端 (Python)</strong></td>
<td>
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white&v=1" alt="FastAPI" /></a>
  <a href="https://www.uvicorn.org/"><img src="https://img.shields.io/badge/Uvicorn-499848?style=flat-square" alt="Uvicorn" /></a>
  <a href="https://docs.pydantic.dev/"><img src="https://img.shields.io/badge/Pydantic_v2-E92063?style=flat-square&logo=pydantic&logoColor=white&v=1" alt="Pydantic" /></a>
  <img src="https://img.shields.io/badge/Python_3.11+-3776AB?style=flat-square&logo=python&logoColor=white&v=1" alt="Python" />
</td>
</tr>
<tr>
<td><strong>数据库</strong></td>
<td>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white&v=1" alt="Supabase" /></a>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white&v=1" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/pgvector-4169E1?style=flat-square&logo=postgresql&logoColor=white&v=1" alt="pgvector" />
  <a href="https://clickhouse.com/"><img src="https://img.shields.io/badge/ClickHouse-FFCC01?style=flat-square&logo=clickhouse&logoColor=black&v=1" alt="ClickHouse" /></a>
  <img src="https://img.shields.io/badge/实时订阅-gray?style=flat-square" alt="Realtime" />
  <img src="https://img.shields.io/badge/RLS-gray?style=flat-square" alt="RLS" />
</td>
</tr>
<tr>
<td><strong>缓存 / 限流</strong></td>
<td>
  <a href="https://upstash.com/"><img src="https://img.shields.io/badge/Upstash_Redis-00E9A3?style=flat-square&logo=redis&logoColor=white&v=1" alt="Upstash" /></a>
  <img src="https://img.shields.io/badge/滑动窗口-gray?style=flat-square" alt="Sliding Window" />
  <img src="https://img.shields.io/badge/令牌桶-gray?style=flat-square" alt="Token Bucket" />
</td>
</tr>
<tr>
<td><strong>实时通信</strong></td>
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
  <img src="https://img.shields.io/badge/30+_提供商-475569?style=flat-square" alt="30+ providers" />
</td>
</tr>
<tr>
<td><strong>搜索</strong></td>
<td>
  <a href="https://www.meilisearch.com/"><img src="https://img.shields.io/badge/Meilisearch-FF5CAA?style=flat-square&logo=meilisearch&logoColor=white&v=1" alt="Meilisearch" /></a>
  <a href="https://typesense.org/"><img src="https://img.shields.io/badge/Typesense-DA1A60?style=flat-square&logo=typesense&logoColor=white&v=1" alt="Typesense" /></a>
  <a href="https://www.algolia.com/"><img src="https://img.shields.io/badge/Algolia-003DFF?style=flat-square&logo=algolia&logoColor=white&v=1" alt="Algolia" /></a>
</td>
</tr>
<tr>
<td><strong>队列</strong></td>
<td>
  <a href="https://upstash.com/qstash"><img src="https://img.shields.io/badge/QStash-00E9A3?style=flat-square&logo=upstash&logoColor=white&v=1" alt="QStash" /></a>
  <a href="https://docs.bullmq.io/"><img src="https://img.shields.io/badge/BullMQ-DC382D?style=flat-square&logo=redis&logoColor=white&v=1" alt="BullMQ" /></a>
</td>
</tr>
<tr>
<td><strong>存储 / 上传</strong></td>
<td>
  <a href="https://www.cloudflare.com/products/r2/"><img src="https://img.shields.io/badge/Cloudflare_R2-F38020?style=flat-square&logo=cloudflare&logoColor=white&v=1" alt="R2" /></a>
  <a href="https://aws.amazon.com/s3/"><img src="https://img.shields.io/badge/AWS_S3-569A31?style=flat-square&logo=amazons3&logoColor=white&v=1" alt="S3" /></a>
  <a href="https://vercel.com/docs/storage/vercel-blob"><img src="https://img.shields.io/badge/Vercel_Blob-black?style=flat-square&logo=vercel" alt="Vercel Blob" /></a>
  <img src="https://img.shields.io/badge/分片上传-gray?style=flat-square" alt="Multipart" />
  <img src="https://img.shields.io/badge/预签名_URL-gray?style=flat-square" alt="Presigned URLs" />
</td>
</tr>
<tr>
<td><strong>通知</strong></td>
<td>
  <a href="https://novu.co/"><img src="https://img.shields.io/badge/Novu-4F46E5?style=flat-square" alt="Novu" /></a>
  <img src="https://img.shields.io/badge/应用内-gray?style=flat-square" alt="In-app" />
  <img src="https://img.shields.io/badge/邮件-gray?style=flat-square" alt="Email" />
  <img src="https://img.shields.io/badge/推送-gray?style=flat-square" alt="Push" />
  <img src="https://img.shields.io/badge/短信-gray?style=flat-square" alt="SMS" />
</td>
</tr>
<tr>
<td><strong>Webhook</strong></td>
<td>
  <a href="https://www.svix.com/"><img src="https://img.shields.io/badge/Svix-1F2937?style=flat-square" alt="Svix" /></a>
  <img src="https://img.shields.io/badge/HMAC_签名-gray?style=flat-square" alt="HMAC" />
  <img src="https://img.shields.io/badge/重试_+_DLQ-gray?style=flat-square" alt="Retry + DLQ" />
</td>
</tr>
<tr>
<td><strong>短信 (国内)</strong></td>
<td>
  <img src="https://img.shields.io/badge/阿里云短信-FF6A00?style=flat-square&logo=alibabacloud&logoColor=white&v=1" alt="Aliyun" />
  <img src="https://img.shields.io/badge/腾讯云短信-006EFF?style=flat-square&logo=tencentqq&logoColor=white&v=1" alt="Tencent" />
</td>
</tr>
<tr>
<td><strong>支付</strong></td>
<td>
  <a href="https://stripe.com/"><img src="https://img.shields.io/badge/Stripe-008CDD?style=flat-square&logo=stripe&logoColor=white&v=1" alt="Stripe" /></a>
  <img src="https://img.shields.io/badge/用量计量-gray?style=flat-square" alt="Metering" />
  <img src="https://img.shields.io/badge/权益管理-gray?style=flat-square" alt="Entitlements" />
</td>
</tr>
<tr>
<td><strong>邮件</strong></td>
<td>
  <a href="https://resend.com/"><img src="https://img.shields.io/badge/Resend-black?style=flat-square&logo=resend&logoColor=white&v=1" alt="Resend" /></a>
  <a href="https://react.email/"><img src="https://img.shields.io/badge/React_Email-61DAFB?style=flat-square&logo=react&logoColor=black&v=1" alt="React Email" /></a>
</td>
</tr>
<tr>
<td><strong>CMS / 文档</strong></td>
<td>
  <a href="https://www.sanity.io/"><img src="https://img.shields.io/badge/Sanity_Studio_v4-F03E2F?style=flat-square&logo=sanity&logoColor=white&v=1" alt="Sanity" /></a>
  <a href="https://fumadocs.vercel.app/"><img src="https://img.shields.io/badge/Fumadocs-000?style=flat-square" alt="Fumadocs" /></a>
  <a href="https://mintlify.com/"><img src="https://img.shields.io/badge/Mintlify-1D40AF?style=flat-square" alt="Mintlify" /></a>
</td>
</tr>
<tr>
<td><strong>设计同步</strong></td>
<td>
  <a href="https://figma.com/"><img src="https://img.shields.io/badge/Figma-F24E1E?style=flat-square&logo=figma&logoColor=white&v=1" alt="Figma" /></a>
  <a href="https://penpot.app/"><img src="https://img.shields.io/badge/Penpot-1A1A1A?style=flat-square" alt="Penpot" /></a>
</td>
</tr>
<tr>
<td><strong>CDN / 安全</strong></td>
<td>
  <a href="https://cloudflare.com/"><img src="https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white&v=1" alt="Cloudflare" /></a>
  <img src="https://img.shields.io/badge/WAF-gray?style=flat-square" alt="WAF" />
  <img src="https://img.shields.io/badge/Turnstile-gray?style=flat-square" alt="Turnstile" />
  <img src="https://img.shields.io/badge/CASL_权限-gray?style=flat-square" alt="CASL" />
  <img src="https://img.shields.io/badge/KMS_保险库-gray?style=flat-square" alt="Vault" />
</td>
</tr>
<tr>
<td><strong>工作流</strong></td>
<td>
  <a href="https://www.inngest.com/"><img src="https://img.shields.io/badge/Inngest-6366F1?style=flat-square" alt="Inngest" /></a>
  <a href="https://n8n.io/"><img src="https://img.shields.io/badge/n8n-EA4B71?style=flat-square&logo=n8n&logoColor=white&v=1" alt="n8n" /></a>
  <img src="https://img.shields.io/badge/Saga_编排-gray?style=flat-square" alt="Saga" />
</td>
</tr>
<tr>
<td><strong>分析</strong></td>
<td>
  <a href="https://dub.co/"><img src="https://img.shields.io/badge/Dub-000000?style=flat-square" alt="Dub" /></a>
  <img src="https://img.shields.io/badge/链接归因-gray?style=flat-square" alt="Link Attribution" />
  <img src="https://img.shields.io/badge/转化追踪-gray?style=flat-square" alt="Conversions" />
</td>
</tr>
<tr>
<td><strong>可观测性</strong></td>
<td>
  <a href="https://sentry.io/"><img src="https://img.shields.io/badge/Sentry-362D59?style=flat-square&logo=sentry&logoColor=white&v=1" alt="Sentry" /></a>
  <a href="https://opentelemetry.io/"><img src="https://img.shields.io/badge/OpenTelemetry-425CC7?style=flat-square&logo=opentelemetry&logoColor=white&v=1" alt="OpenTelemetry" /></a>
  <a href="https://www.openstatus.dev/"><img src="https://img.shields.io/badge/OpenStatus-000?style=flat-square" alt="OpenStatus" /></a>
</td>
</tr>
<tr>
<td><strong>构建 / 部署</strong></td>
<td>
  <a href="https://vercel.com/"><img src="https://img.shields.io/badge/Vercel-black?style=flat-square&logo=vercel" alt="Vercel" /></a>
  <a href="https://turbo.build/"><img src="https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white&v=1" alt="Turborepo" /></a>
  <a href="https://pnpm.io/"><img src="https://img.shields.io/badge/pnpm_10-F69220?style=flat-square&logo=pnpm&logoColor=white&v=1" alt="pnpm" /></a>
  <a href="https://biomejs.dev/"><img src="https://img.shields.io/badge/Biome-60A5FA?style=flat-square&logo=biome&logoColor=white&v=1" alt="Biome" /></a>
</td>
</tr>
</table>

<br />

## 平台能力

{{brand.name}} 是**与 Provider 无关**的：以下每个平台包都会从环境变量自动检测后端实现，客户切换 provider 无需改动应用代码。每个包都内置 in-memory 实现用于测试，并通过 [tests/architecture/](tests/architecture/) 下的架构测试强制约束 TypeScript 契约。

<table>
<tr><th>能力</th><th>包</th><th>支持的 Provider（自动检测）</th></tr>
<tr><td>身份认证</td><td><code>@nebutra/auth</code></td><td>Clerk · Better Auth · Auth.js</td></tr>
<tr><td>身份提供方</td><td><code>@nebutra/oauth-server</code></td><td>OIDC (oidc-provider) · Redis 会话</td></tr>
<tr><td>权限</td><td><code>@nebutra/permissions</code></td><td>CASL — RBAC + ABAC，Hono 中间件，React <code>&lt;Can /&gt;</code></td></tr>
<tr><td>多租户</td><td><code>@nebutra/tenant</code></td><td>AsyncLocalStorage 上下文 · Prisma RLS 桥接</td></tr>
<tr><td>验证码</td><td><code>@nebutra/captcha</code></td><td>Cloudflare Turnstile</td></tr>
<tr><td>密钥保险库</td><td><code>@nebutra/vault</code></td><td>AWS KMS 信封加密 · 本地 HKDF（开发）</td></tr>
<tr><td>审计日志</td><td><code>@nebutra/audit</code></td><td>追加式哈希链</td></tr>
<tr><td>缓存</td><td><code>@nebutra/cache</code></td><td>Upstash Redis · in-memory</td></tr>
<tr><td>限流</td><td><code>@nebutra/rate-limit</code></td><td>滑动窗口 · 令牌桶（Upstash）</td></tr>
<tr><td>队列</td><td><code>@nebutra/queue</code></td><td>QStash · BullMQ · in-memory</td></tr>
<tr><td>搜索</td><td><code>@nebutra/search</code></td><td>Meilisearch · Typesense · Algolia</td></tr>
<tr><td>存储 / 上传</td><td><code>@nebutra/uploads</code></td><td>Cloudflare R2 · AWS S3 · Vercel Blob · 本地文件系统</td></tr>
<tr><td>通知</td><td><code>@nebutra/notifications</code></td><td>Novu — 应用内 · 邮件 · 推送 · 短信 · 即时聊天</td></tr>
<tr><td>Webhook</td><td><code>@nebutra/webhooks</code></td><td>Svix · 自定义 HMAC 投递</td></tr>
<tr><td>短信（国内）</td><td><code>@nebutra/sms</code></td><td>阿里云 · 腾讯云</td></tr>
<tr><td>邮件</td><td><code>@nebutra/email</code></td><td>Resend + React Email 模板</td></tr>
<tr><td>计费</td><td><code>@nebutra/billing</code></td><td>Stripe — 订阅、用量、权益</td></tr>
<tr><td>用量计量</td><td><code>@nebutra/metering</code></td><td>ClickHouse 实时聚合</td></tr>
<tr><td>事件总线</td><td><code>@nebutra/event-bus</code></td><td>多租户 Pub/Sub · Fan-out · Request-Reply</td></tr>
<tr><td>Saga 编排</td><td><code>@nebutra/saga</code></td><td>原生 TS 流程，自动回滚补偿</td></tr>
<tr><td>特性开关</td><td><code>@nebutra/feature-flags</code></td><td>数据库存储 + 环境变量覆盖</td></tr>
<tr><td>设计令牌</td><td><code>@nebutra/design-sync</code></td><td>W3C DTCG ↔ Figma · Penpot · git-only</td></tr>
<tr><td>状态聚合</td><td><code>@nebutra/status</code></td><td>OpenStatus · Atlassian StatusPage</td></tr>
</table>

<br />

## 快速开始

### 环境要求

| 工具    | 版本                              |
| ------- | --------------------------------- |
| Node.js | `v20+`                            |
| pnpm    | `v9+`                             |
| Python  | `3.11+` <sub>（微服务需要）</sub> |

### 安装

```bash
# 克隆仓库
git clone https://github.com/{{repo.full}}.git
cd {{repo.name}}

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env

# 生成 Prisma 客户端并启动开发服务器
pnpm db:generate && pnpm dev
```

### 常用命令

| 命令             | 说明                     |
| ---------------- | ------------------------ |
| `pnpm dev`       | 启动所有应用（开发模式） |
| `pnpm build`     | 构建所有包               |
| `pnpm lint`      | 代码检查                 |
| `pnpm typecheck` | 类型检查                 |
| `pnpm db:studio` | 打开 Prisma Studio       |

<br />

## 参与贡献

我们欢迎所有贡献者！

|              |                                                       |
| ------------ | ----------------------------------------------------- |
| **报告 Bug** | [提交 Issue](https://github.com/{{repo.full}}/issues) |
| **功能建议** | 通过 Issue 提出                                       |
| **提交 PR**  | 添加功能或修复 Bug                                    |

<br />

## 许可证

**AGPLv3**

|                |                              |
| -------------- | ---------------------------- |
| **免费使用**   | 个人项目、学习和内部工具     |
| **可自由修改** | 创建衍生作品                 |
| **可自由分发** | 需注明出处                   |
| **商业使用**   | 需开源                       |
| **豁免**       | {{license.commercialExempt}} |

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
    <strong>每一次提交，都在创造未来。</strong>
  </sub>
  <br />
  <br />
  <sub>© {{company.year}}-至今 {{company.nameCN}}</sub>
</div>
