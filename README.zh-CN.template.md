<div align="right">
  <a href="README.md">English</a> | <strong>简体中文</strong> | <a href="README.ja.md">日本語</a>
</div>

<div align="center">
  <a href="https://nebutra.com/zh-Hans/sailor">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/design/brand/assets/logo/logo-inverse.svg" />
      <source media="(prefers-color-scheme: light)" srcset="packages/design/brand/assets/logo/logo-horizontal-en.svg" />
      <img alt="{{brand.name}}" src="packages/design/brand/assets/logo/logo-horizontal-en.svg" width="260" />
    </picture>
  </a>
  <h1>Sailor — Skip to production.</h1>
  <p>给 AI 写出来的产品铺好上线的路：认证、全球 + 中国支付、多租户、AI 网关，一条命令，零密钥本地就能跑。代码归你。以 Apache-2.0 开源。</p>
  <p>面向 AI 编码智能体的开源 SaaS 底座（Apache-2.0）：认证、银行卡与微信支付 / 支付宝收款、由 schema 生成行级安全（RLS）的多租户 Postgres、Hono API 网关——一条命令生成，空 <code>.env</code> 就能在本地跑起来。</p>
  <p>
    <a href="https://github.com/{{repo.full}}/actions/workflows/scaffold-nightly.yml"><img src="https://github.com/{{repo.full}}/actions/workflows/scaffold-nightly.yml/badge.svg" alt="每晚从零生成并启动" /></a>
    <a href="https://www.npmjs.com/package/create-sailor"><img src="https://img.shields.io/npm/v/create-sailor?label=create-sailor&color=18191c" alt="npm: create-sailor" /></a>
    <a href="#许可证"><img src="https://img.shields.io/badge/license-Apache--2.0-2e65ee" alt="许可证：Apache-2.0" /></a>
    <a href="https://github.com/{{repo.full}}/stargazers"><img src="https://img.shields.io/github/stars/{{repo.full}}?color=18191c" alt="GitHub stars" /></a>
  </p>
  <p>
    <a href="https://nebutra.com/zh-Hans/sailor"><strong>官网</strong></a> ·
    <a href="https://nebutra.com/docs"><strong>文档</strong></a> ·
    <a href="https://nebutra.com/zh-Hans/sailor/compare"><strong>横向对比</strong></a> ·
    <a href="https://github.com/{{repo.full}}/discussions"><strong>讨论区</strong></a>
  </p>
</div>

<!-- VIDEO: 60 秒演示视频会替换下面这段录屏。 -->
<p align="center"><img src="docs/assets/sailor-create.gif" width="720" alt="npx create-sailor@latest 的真实运行录屏：下载模板、写入项目、打印下一步" /></p>

**你自己用**——生成项目，然后启动。不需要任何密钥，也不用装 Postgres（本地用 PGlite）：

```bash
npx create-sailor@latest my-app
cd my-app && pnpm dev        # 应用 :3001 · 官网 :3000 · 网关 :3002
```

**交给你的智能体**（Claude Code、Cursor、Codex……）——装上 skill，再让它开工：

```bash
npx skills add {{repo.full}} --skill sailor
```

| 开箱即有 | 代码位置 |
| --- | --- |
| 收款：Creem 收全球银行卡（Merchant of Record）+ 微信支付 / 支付宝；订阅、积分、权益、用量计费 | `packages/commerce/billing` |
| 多租户：在 `schema.prisma` 里写一行 `/// @rls`，就会生成对应的 Postgres 策略（目前 91 条） | `packages/platform/db`、`packages/iam/tenant` |
| 唯一的 API 入口：Hono 网关挂在 Next 的 `/api` 下（单进程），也可以单独部署 | `backends/gateway` |
| 认证：Better Auth（含组织），外加一个 OIDC 身份提供方 | `packages/iam/auth`、`apps/idp` |
| 每个领域只有一个供应商：Resend、S3 兼容存储（R2 / OSS）、QStash、Redis、pgvector 搜索、Sentry、PostHog、Turnstile。填上密钥就上线，没填就走本地降级 | `nebutra status --json` |
| 智能体不容易悄悄写坏的护栏：`AGENTS.md` / `CLAUDE.md` / `DESIGN.md`，Biome 加只减不增的 lint 棘轮 | `pnpm lint` |
| 设计系统：`@nebutra/ui`、W3C DTCG 设计令牌、541 个 Geist 图标、7 套品牌语言、Storybook | `packages/design` |
| 国内开关：`NEBUTRA_LOCALE=cn` 让结账优先走微信支付 / 支付宝、短信优先走阿里云，项目里还带 ICP 备案页脚和 AIGC 标识组件；OSS 走同一个 S3 适配器 | `@nebutra/contracts/market` |
| CLI：给智能体读的 `nebutra status`，设备码方式的 `nebutra login` | `npx nebutra` |

**暂时没有的：** 供应商菜单（每个领域只有一个适配器，换供应商请按接口自己写一个）；托管平台的选择（你拿到的是 Next `standalone` 构建产物和 Dockerfile）；手机号优先登录（Better Auth 的手机号插件还没接上）；三方合并式的模板升级；移动端和桌面端应用；以及“小”——这是一个完整的 monorepo，不是 50 个文件的入门模板。和其他脚手架的对比见 [nebutra.com/sailor/compare](https://nebutra.com/zh-Hans/sailor/compare)。

**许可证：** Apache-2.0——本仓库、所有 npm 包以及你生成的项目都是。详见下方[许可证](#许可证)。

<br />

## 技术栈

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/sailor-stack-dark.png" />
  <img src="docs/assets/sailor-stack-light.png" width="100%" alt="create-sailor 生成的结构：apps/web 通过 /api 调用 Hono 网关，网关访问带生成式行级安全的 Postgres；每项能力填上密钥即上线，否则本地降级或关闭" />
</picture>

每一层只有一个答案——就是 Nebutra 生产环境在跑的那套（[ADR 2026-09-24](docs/architecture/2026-09-24-sailor-convergence.md)）。

| 层 | 选型 |
| --- | --- |
| 应用 | Next.js 16 · React 19 · TypeScript · Tailwind 4 |
| API | Hono 网关（`backends/gateway`）· oRPC · Zod |
| 数据 | Postgres + Prisma 7 · 生成式 RLS · pgvector · ClickHouse（用量计量）· 本地 PGlite |
| 认证 | Better Auth（组织）· OIDC 身份提供方（`apps/idp`）· CASL 权限 |
| 支付 | Creem + 微信支付 / 支付宝 |
| 消息 | Resend · Twilio Verify + 阿里云短信 · QStash · Redis |
| 存储 | 一个 S3 兼容适配器（Cloudflare R2、阿里云 OSS） |
| 可观测性 | Sentry · PostHog · OpenTelemetry |
| UI | `@nebutra/ui`（Radix）· W3C DTCG 设计令牌 · Geist 图标 · Storybook |
| AI | Vercel AI SDK · MCP · 只有批处理 / ML 场景才用 Python FastAPI 服务 |
| 工具链 | pnpm · Turborepo · Biome · Vitest · Playwright · changesets |

<br />

## 平台能力

Sailor 的每个领域**只有一个供应商**（[ADR 2026-09-24](docs/architecture/2026-09-24-sailor-convergence.md)）：以下每个平台包都从环境变量读取密钥，没有密钥时降级到本地实现，所以空 `.env` 也能 `pnpm dev`。每个包都内置 in-memory 实现用于测试，并通过 [tests/architecture/](tests/architecture/) 下的架构测试强制约束 TypeScript 契约。

<table>
<tr><th>能力</th><th>包</th><th>支持的 Provider（自动检测）</th></tr>
<tr><td>身份认证</td><td><code>@nebutra/auth</code></td><td>Better Auth（组织、Passkey）</td></tr>
<tr><td>身份提供方</td><td><code>@nebutra/oauth</code></td><td>OIDC (oidc-provider) · Redis 会话</td></tr>
<tr><td>权限</td><td><code>@nebutra/permissions</code></td><td>CASL — RBAC + ABAC，Hono 中间件，React <code>&lt;Can /&gt;</code></td></tr>
<tr><td>多租户</td><td><code>@nebutra/tenant</code></td><td>AsyncLocalStorage 上下文 · Prisma RLS 桥接</td></tr>
<tr><td>验证码</td><td><code>@nebutra/captcha</code></td><td>Cloudflare Turnstile</td></tr>
<tr><td>密钥保险库</td><td><code>@nebutra/vault</code></td><td>AWS KMS 信封加密 · 本地 HKDF（开发）</td></tr>
<tr><td>审计日志</td><td><code>@nebutra/audit</code></td><td>追加式哈希链</td></tr>
<tr><td>缓存</td><td><code>@nebutra/cache</code></td><td>Redis（Upstash REST 协议）· in-memory</td></tr>
<tr><td>限流</td><td><code>@nebutra/rate-limit</code></td><td>滑动窗口 · 令牌桶（Upstash）</td></tr>
<tr><td>队列</td><td><code>@nebutra/queue</code></td><td>QStash · in-memory</td></tr>
<tr><td>搜索</td><td><code>@nebutra/search</code></td><td>Postgres — pgvector + 全文检索</td></tr>
<tr><td>存储 / 上传</td><td><code>@nebutra/uploads</code></td><td>一个 S3 兼容适配器（Cloudflare R2、阿里云 OSS）· 本地文件系统</td></tr>
<tr><td>通知</td><td><code>@nebutra/notifications</code></td><td>内置分发 — 应用内 · 邮件 · 推送 · 短信 · 即时聊天</td></tr>
<tr><td>Webhook</td><td><code>@nebutra/webhooks</code></td><td>内置 HMAC 签名投递，带重试</td></tr>
<tr><td>短信</td><td><code>@nebutra/sms</code></td><td>Twilio Verify + 阿里云</td></tr>
<tr><td>邮件</td><td><code>@nebutra/email</code></td><td>Resend + React Email 模板</td></tr>
<tr><td>计费</td><td><code>@nebutra/billing</code></td><td>Creem（全球卡组织，交易商户）+ 微信支付/支付宝 — 订阅、用量、权益</td></tr>
<tr><td>用量计量</td><td><code>@nebutra/metering</code></td><td>ClickHouse 实时聚合</td></tr>
<tr><td>事件总线</td><td><code>@nebutra/event-bus</code></td><td>多租户 Pub/Sub · Fan-out · Request-Reply</td></tr>
<tr><td>Saga 编排</td><td><code>@nebutra/saga</code></td><td>原生 TS 流程，自动回滚补偿</td></tr>
<tr><td>特性开关</td><td><code>@nebutra/feature-flags</code></td><td>数据库存储 + 环境变量覆盖</td></tr>
<tr><td>设计令牌</td><td><code>@nebutra/design-sync</code></td><td>W3C DTCG，仅 git</td></tr>
<tr><td>状态聚合</td><td><code>@nebutra/status</code></td><td>OpenStatus · Atlassian StatusPage</td></tr>
</table>

<br />

## 项目结构

```
{{repo.name}}/
├── apps/                      # 用户面应用 (Next.js)
│   ├── landing/      # 营销官网 (nebutra.com)
│   ├── web/               # SaaS 主控台 (app.nebutra.com)
│   ├── studio/            # Sanity CMS (studio.nebutra.com)
│   ├── sailor-docs/       # 公开产品文档 (nebutra.com/docs)
│   ├── idp/               # 身份认证服务 (OAuth 2.0 / OIDC)
│   ├── storybook/         # 组件 Playground
│   ├── mail-preview/      # 邮件模板预览
│   ├── sleptons/          # Sleptons 配套应用
├── packages/                  # 共享 TS 库（W3b 已分类）
│   ├── ai/                # 42 个 — 例如 agents、agent-runtime、ai-providers、startup-os、knowledge-rag、mcp
│   ├── commerce/          # 9 个 — 例如 billing、metering、contracts、license、access-gate、waitlist
│   ├── design/            # 9 个 — 例如 ui、tokens、design-tokens、brand、theme、icons、fonts
│   ├── iam/               # 8 个 — auth、audit、vault、oauth、permissions、tenant、identity、captcha
│   ├── integrations/      # 17 个 — 例如 queue、search、email、notifications、storage、webhooks、cache
│   ├── ops/               # 5 个 — cli、create-sailor、preset、sanity、china-compliance
│   └── platform/          # 21 个 — 例如 db、logger、repositories、rate-limit、feature-flags、i18n、status
├── backends/                  # 无 UI 后端（按语言拆分，参考 vercel/vercel）
│   ├── gateway/           # TypeScript / Hono — BFF、auth、租户、路由
│   └── python/            # FastAPI — 仅当 ML/批处理/专用库无法用 TS 时启用
│       ├── _shared/       # 跨服务原语（auth、db、queue 客户端）
│       └── ai/            # LLM、Embeddings、Agent 编排
├── infra/                     # 基础设施（W2.2 按职责拆分）
│   ├── iac/               # terraform + k8s + ecs + cloudflare + railway
│   ├── runtime/           # nginx + docker + analytics + compose 文件
│   ├── data/              # database (RLS) + clickhouse (init + dbt)
│   └── ops/               # observability + 部署脚本
├── ops/                       # 各品牌声明的平台状态，platform-reconcile 每日核对
├── workflows/                 # 事件驱动业务流（W2.3 抽离）
│   ├── inngest/           # Serverless 后台任务 + 定时
│   └── pusher/            # 实时消息粘合层
├── e2e/                       # Playwright E2E 测试 (smoke / golden / sleptons)
├── tests/                     # 架构不变量 + 压测 + UI 治理
└── docs/                      # 架构文档
```

<br />

## 文档

各组件均有独立 README，包含配置说明和 API 文档：

<table>
<tr>
<td><strong>微服务</strong></td>
<td>
  <a href="backends/python/ai/">AI</a>
</td>
</tr>
<tr>
<td><strong>公共包</strong></td>
<td>
  <a href="packages/design/ui/">UI</a> ·
  <a href="packages/design/tokens/">Tokens</a> ·
  <a href="packages/commerce/marketing/">Marketing</a> · 
  <a href="packages/platform/db/">DB</a> ·
  <a href="packages/integrations/cache/">Cache</a> · 
  <a href="packages/platform/rate-limit/">Rate Limit</a> · 
  <a href="packages/integrations/event-bus/">Event Bus</a> · 
  <a href="packages/integrations/saga/">Saga</a> · 
  <a href="packages/ai/mcp/">MCP</a> · 
  <a href="packages/platform/analytics/">Analytics</a>
</td>
</tr>
<tr>
<td><strong>设计文档</strong></td>
<td>
</td>
</tr>
<tr>
<td><strong>基础设施</strong></td>
<td>
  <a href="infra/runtime/docker/">Docker</a> · 
  <a href="infra/iac/terraform/">Terraform</a> · 
  <a href="workflows/inngest/">Inngest</a> · 
  <a href="workflows/pusher/">Pusher</a> · 
  <a href="infra/ops/observability/">可观测性</a>
</td>
</tr>
</table>

<br />

## CLI 与官网

### 通过 npm 使用 CLI

新项目建议直接从 npm 创建，不需要先 clone 整个 monorepo 再裁剪：

```bash
# 创建新的 Sailor 项目
npx create-sailor@latest
npm create sailor@latest
pnpm create sailor@latest
bunx create-sailor@latest

# 运维已有的 Sailor 项目
npx nebutra --help
npm install -g nebutra
```

| 包 | 用途 |
| -- | ---- |
| [`create-sailor`](https://www.npmjs.com/package/create-sailor) | 创建新的 {{brand.name}} Sailor 项目。没有任何选项要选：每次都是同一套收敛后的技术栈（智能体和 CI 用 `--json`）。 |
| [`nebutra`](https://www.npmjs.com/package/nebutra) | 运维已有项目：`status`（哪些已上线、哪些还缺密钥）、`sync`、`db`、`dev`、设备码方式的 `login`。 |

### nebutra.com

[`nebutra.com`](https://nebutra.com) 是 {{brand.name}} Sailor 的公开产品入口，也是我们自己 dogfooding 这套平台的地方。后续更多产品能力、商业授权、托管能力、发布工作流和基于本仓库构建的真实案例都会在官网持续更新。

公开工具站在 [`forge.nebutra.com`](https://forge.nebutra.com) — 编解码、文本、哈希、文档与图片工具，同一套实现也可通过 API / MCP 调用。

<br />

## 快速开始

### 环境要求

<table>
<tr><td><strong>Node.js</strong></td><td><code>v22+</code></td></tr>
<tr><td><strong>pnpm</strong></td><td><code>v11.28.5+</code></td></tr>
<tr><td><strong>Python</strong></td><td><code>3.11+</code> <sub>（微服务需要）</sub></td></tr>
</table>

### 参与开发本仓库

要做产品，请用页面顶部的 `npx create-sailor@latest` 生成项目。克隆本仓库是为了给 Sailor 本身做贡献：

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

| 命令               | 说明                           |
| ------------------ | ------------------------------ |
| `pnpm dev`         | 启动所有应用（开发模式）       |
| `pnpm build`       | 构建所有包（自动同步品牌资产） |
| `pnpm lint`        | 代码检查                       |
| `pnpm typecheck`   | 类型检查                       |
| `pnpm db:studio`   | 打开 Prisma Studio             |
| `pnpm brand:sync`  | 同步品牌资产到各应用           |
| `pnpm brand:init`  | 初始化白标品牌                 |
| `pnpm brand:apply` | 应用自定义品牌                 |

<br />

## 白标定制

Fork 本仓库并自定义为你的品牌：

```bash
# 交互式设置向导
pnpm brand:init

# 将 logo 放入 brand.config/assets/

# 应用品牌
pnpm brand:apply
```

详见 [WHITELABEL.md](WHITELABEL.md)。

<br />

## 参与贡献

我们欢迎所有贡献者！以下是参与方式：

|              |                                                                |
| ------------ | -------------------------------------------------------------- |
| **报告 Bug** | [提交 Issue](https://github.com/{{repo.full}}/issues) |
| **功能建议** | 通过 Issue 提出                                                |
| **提交 PR**  | 添加功能或修复 Bug                                             |

### 开发流程

```
1. Fork 本仓库
2. 创建功能分支 (git checkout -b feat/amazing-feature)
3. 提交更改 (git commit -m 'feat: 添加精彩功能')
4. 推送分支 (git push origin feat/amazing-feature)
5. 发起 Pull Request
```

<br />

## 版本与发布节奏

所有已发布的包目前都在 **0.x 版本区间**，公共 API 仍在收敛。按
[SemVer §4](https://semver.org/lang/zh-CN/#spec-item-4)，主版本号为零意味着
**任何 0.x 发布都可能包含破坏性变更**——在生产环境请精确锁定版本
(`"nebutra": "0.3.1"`)，不要用 caret 范围，等我们切到 1.0 之后再放开。

- 版本由 [changesets](https://github.com/changesets/changesets) 驱动。每个改动已发布包的 PR 都必须包含 `.changeset/*.md` 声明 patch/minor/major 意图——CI 会强制这个 gate。
- 每个包的 `CHANGELOG.md` 由 `changeset version` 生成并与版本号一同提交（例如 [`packages/ops/cli/CHANGELOG.md`](packages/ops/cli/CHANGELOG.md)）。
- Release 工作流是**手动触发**（`workflow_dispatch`）——不会在 PR 合并后突然发版。我们会成批协调相关改动后才切版本。
- 1.0 之前的重大 API 改动（例如 CLI 命令重命名、包的目录重新分类）会先发 **release candidate**：`nebutra@0.4.0-rc.0` 落在 `next` dist-tag，浸泡 ≥ 1 周后才升为 `latest`。安装 RC：`npm i nebutra@next`。
- npm 发布会附带 **provenance attestation**（一旦 npm registry 端启用了 trusted-publishing；工作流端已经接好——见 [`release.yml`](.github/workflows/release.yml) 的 `NPM_CONFIG_PROVENANCE: "true"`）。验证已发布的 tarball：`npm view <pkg> --json | jq .dist.attestations`。

我们会以发布 `1.0.0` 来标志 **API 稳定**。在那之前，请把当前的 API 理解为
"形态可生产，细节仍在演进"。

<br />

## 许可证

**{{brand.name}} Sailor 以 [Apache License 2.0](./LICENSE) 开源。** 范围包括本仓库、
所有 npm 发布包（`@nebutra/*`、`nebutra`、`create-sailor`）、Sailor-Template 镜像，
以及 `create-sailor` 生成的每个项目（自带 Apache-2.0 `LICENSE` 和 `NOTICE`）。

用它做商业产品、闭源、作为托管服务运行、fork——全部免费，无费用、无授权密钥、
无需注册、无 Copyleft。再分发源码时，保留 `LICENSE` 和 `NOTICE`、保留原有版权
声明，并标注你改过的文件（Apache-2.0 第 4 条）。

商标是独立的：Apache-2.0 不授予商标权（第 6 条）。给自己的产品起一个无关的
名字不需要任何许可；使用 {{brand.name}} 或 Sailor 名称需要商标授权
（见 [TRADEMARK.md](./TRADEMARK.md)）。

**付费档卖的不是使用权**，而是代码许可证给不了的东西：支持承诺、响应 SLA、
赔偿、合规文件（DPA、安全材料、业务连续性承诺）以及商标授权。
Community $0 · Team $2,000/年 · Enterprise $30,000/年起——详见
[docs/legal/commercial-support.md](docs/legal/commercial-support.md)。

版权所有 2025–2026 {{company.nameCN}}。

> 2026-10-16 起改为 Apache-2.0（此前本仓库为 FSL-1.1-ALv2、npm 包为 MIT；
> 2026-07-26 之前为 AGPL-3.0-only）。更早发布的版本保留其发布时的许可证。详见
> [docs/legal/license-history.md](docs/legal/license-history.md)。

授权问题请联系 **legal@nebutra.com** ·
[授权 FAQ](docs/legal/licensing-faq.md)

<br />

---

<br />

<div align="center">
  <a href="https://nebutra.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="packages/design/brand/assets/logo/logo-inverse.svg" width="120">
      <source media="(prefers-color-scheme: light)" srcset="packages/design/brand/assets/logo/logo-mono.svg" width="120">
      <img alt="{{brand.name}}" src="packages/design/brand/assets/logo/logo-mono.svg" width="120">
    </picture>
  </a>
  <br />
  <br />
  <p>
<strong>每一次上线，都是增长在场。</strong>
  </p>
  <p>
    <sub>出品 <a href="https://nebutra.com"><strong>{{brand.name}} Intelligence</strong></a> · © 2024-至今 <strong>{{company.nameCN}}</strong></sub>
  </p>
  <br />
  <p>
    <a href="https://nebutra.com">官网</a>
  </p>
  <p>
    <a href="https://x.com/nebutra">X</a>
  </p>
  <p>
    <a href="mailto:contact@nebutra.com">联系我们</a>
  </p>
</div>
