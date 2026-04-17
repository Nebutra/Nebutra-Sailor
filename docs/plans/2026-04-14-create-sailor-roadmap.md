# `create-sailor` 后续 Roadmap · Gemini Handoff

> **Handoff date**: 2026-04-14
> **Current published version**: `create-sailor@1.0.0` on npm
> **Status**: 1.0.0 已发布，核心 UX 完成，业务逻辑接入 + 生态铺设待完成
> **Target executor**: Gemini / other AI agent

---

## 0. 背景速读

**Nebutra-Sailor 是什么**
- 双重定位：既是 Nebutra 自身运营的 AI-Native SaaS 产品，也是用户 `npm create sailor@latest` 能直接拉下来用的模板
- Monorepo：8 apps + 54 packages + 9 微服务（Python）
- 技术栈：Next.js 16 · Hono · Prisma · Tailwind v4 · shadcn/ui · AI SDK v5
- 双重许可：AGPL-3.0 + 商业例外（OPC 免费、Startup $799/年、Enterprise 联系）
- 定位：对标 Supastarter 并超越，对齐 2026 Harness Engineering 最佳实践，支持中国出海双场景

**v1.0.0 已完成（不要重做）**
1. `create-sailor` npm 包发布（`npm create sailor@latest`）
2. cfonts block 蓝青渐变 banner + 完整 CLI flag 解析
3. `--help` / `--version` / `-y` / `--dry-run` / `--json` / `--no-color` / SIGINT cleanup
4. Post-install 三段卡片（Next / Customize / Ship faster）
5. PM 自动检测 + `update-notifier`
6. `.templateignore` 系统（71 规则，剥离 Nebutra 业务内容）
7. `packages/ai-providers/` + 20 provider meta + `@sailor:*` marker 模板系统
8. NextAuth 彻底清除（Clerk + BetterAuth 双 provider）
9. 占位包：`nebutra` · `@nebutra/sailor` · `@nebutra/sailor-cli`

---

## 1. 优先级全局视图

```
P0 必须完成（Gemini 第一批任务）
├── 1.1 Provider flag → prompt 流程接入
├── 1.2 Deploy target 配置自动注入
└── 1.3 产品页面骨架模块化（landing + dashboard）

P1 超越竞品（Gemini 第二批）
├── 2.1 sailor add <feature> CLI 命令 + 远程 registry
├── 2.2 双仓库 + CI 同步（sailor-template 镜像）
└── 2.3 完整 provider 注册表扩展（20 → 60+）

P2 生态建设（Gemini 第三批）
├── 3.1 registry.nebutra.com 静态站
├── 3.2 sailor.nebutra.com 文档站
└── 3.3 `.github/workflows/npm-publish.yml` 自动发布
```

---

## 2. P0 任务详解

### 2.1 Provider flag → prompt 流程接入

**现状**
- `packages/create-sailor/src/utils/providers.ts` 的 `renderTemplate()` 已就绪
- `packages/ai-providers/templates/registry.ts.template` 和 `.env.example.template` 已就绪
- `packages/create-sailor/src/index.ts` 已定义 `--ai` flag 但**未串联到 prompt 流程**

**目标**
用户执行：
```bash
npx create-sailor@latest my-app --ai=openai,deepseek,siliconflow
# 或交互模式下分组多选
```
后，自动：
1. 在 `my-app/packages/ai/src/registry.ts` 生成精简版 registry（只含选中 provider）
2. 在 `my-app/.env.example` 追加对应 env 块
3. 在 `my-app/package.json` 自动加对应 `@ai-sdk/*` 依赖

**实施清单**
- [ ] `src/index.ts` 添加 AI provider 交互 prompt：按 category 分组 `multiSelect`
  - 分组顺序：直接实验室 · 国内平台 · 统一网关 · 推理加速 · 多模态 · 本地部署
  - 默认勾选：Vercel AI Gateway 或 OpenAI + Anthropic
  - 如果用户已传 `--ai=xxx` flag 则跳过此 prompt
- [ ] `src/index.ts` 添加「自定义 OpenAI-compatible endpoint」单独 prompt（`confirm` + 3 个 `text`：name、baseURL、apiKeyEnvName）
- [ ] `src/utils/providers.ts` 补齐 `applyProviderSelection(targetDir, selection)` 函数：
  ```ts
  // 伪代码
  export async function applyProviderSelection(
    targetDir: string,
    selection: ProviderSelection,
  ) {
    const registryOut = renderProviderRegistry(selection, templateDir);
    const envOut = renderProviderEnvExample(selection, templateDir);
    await writeFile(join(targetDir, "packages/ai/src/registry.ts"), registryOut);
    await appendFile(join(targetDir, ".env.example"), envOut);
    await updatePackageJson(targetDir, {
      dependencies: deriveDeps(selection), // @ai-sdk/openai 等
    });
  }
  ```
- [ ] 修复 `renderTemplate()` 的已知限制：
  - 当前 `filterRegistryEntries` 是 stub，没做真正的 `createProviderRegistry({...})` 对象内 key 过滤
  - 需要用 AST（`ts-morph` 或简单正则）把没选中的 provider id 从 registry 对象字面量里删除
- [ ] 单元测试：输入 3 个 provider 选择，断言生成文件正确
- [ ] 运行 `pnpm --filter create-sailor build` + dry-run 验证

**输入文件**
- `packages/create-sailor/src/index.ts` (主流程)
- `packages/create-sailor/src/utils/providers.ts` (渲染器)
- `packages/ai-providers/src/meta.ts` (provider 元数据)
- `packages/ai-providers/templates/*.template` (模板)

**预期产出**
- 用户 scaffold 后 `my-app/packages/ai/src/registry.ts` 可 `pnpm build` 直接通过
- `my-app/.env.example` 只含选中 provider 的 env vars

---

### 2.2 Deploy target 配置自动注入

**现状**
- `--deploy` flag 已定义（`vercel | railway | cloudflare | selfhost`）
- **无任何自动注入逻辑**

**目标**
用户选 `--deploy=vercel` 后，自动生成：
- `vercel.json`（含 `functions` / `rewrites` / `env`）

选 `--deploy=railway`：
- `railway.toml`

选 `--deploy=cloudflare`：
- `wrangler.toml`（针对 `apps/web` 的 OpenNext 配置）

选 `--deploy=selfhost`：
- `docker-compose.yml` 产生 app service + postgres + redis
- `Dockerfile.web`

**实施清单**
- [ ] 新建 `packages/create-sailor/templates/deploy/` 目录，放 4 个子目录模板
- [ ] 新建 `src/utils/deploy.ts`：
  ```ts
  export async function applyDeployTarget(
    targetDir: string,
    target: "vercel" | "railway" | "cloudflare" | "selfhost",
  ) { /* 复制对应模板 */ }
  ```
- [ ] 主流程调用 `applyDeployTarget()` 在 clone 之后
- [ ] 每个模板内置品牌颜色注释、领域占位符
- [ ] 单元测试：4 个 target × 生成文件断言

**参考**
- Vercel docs: https://vercel.com/docs/projects/project-configuration
- Railway docs: https://docs.railway.app/reference/config-as-code
- Cloudflare: https://developers.cloudflare.com/workers/wrangler/configuration/

---

### 2.3 产品页面骨架模块化

**现状**
- `.templateignore` 已剥离 Nebutra 自己的 landing-page 业务内容
- 但**被剥离后 `apps/landing-page` 几乎是空的**，用户 clone 下来看不到任何最佳实践
- 用户曾提供一份 2026 产品页面模块全览（landing + dashboard 几十个模块，带🔵必选 / ⚪可选 / 🔴高阶 / 🟡特定场景 标记）

**目标（骨架 = 必选模块代码 + 可选模块通过 `sailor add` 增量）**

#### Landing Page 必选骨架（生成到 `apps/landing-page/src/`）
| 模块 | 文件位置 | 说明 |
|------|---------|------|
| Header + Nav + Language switcher | `components/landing/Header.tsx` | sticky，Logo + 5 nav items + CTA |
| Hero (Headline + CTA + Social proof) | `components/landing/Hero.tsx` | 标题/副标题/主CTA/次CTA/客户头像堆叠 |
| Logo Bar 客户墙 | `components/landing/LogoBar.tsx` | 灰度自动滚动 |
| Features Bento Grid | `components/landing/Features.tsx` | sticky title + scrolling screenshots |
| Comparison Table | `components/landing/Comparison.tsx` | 我们 vs 竞品类 |
| Testimonials | `components/landing/Testimonials.tsx` | 头像+全名+职位+引用 |
| Pricing 3 列 | `components/landing/Pricing.tsx` | Free/Pro/Enterprise + Most Popular 高亮 |
| FAQ Accordion | `components/landing/FAQ.tsx` | 8-12 条 |
| Final CTA | `components/landing/FinalCTA.tsx` | 深色背景 + 大字 + 主CTA |
| Footer | `components/landing/Footer.tsx` | 多列 + 法律条款 + 社交媒体 + ICP 备案占位 |
| ICP 备案 Badge | `components/common/ICPBadge.tsx` | 国内合规 |

#### Dashboard 必选骨架（生成到 `apps/web/src/`）
| 模块 | 文件位置 | 说明 |
|------|---------|------|
| Shell: Topbar | `components/shell/Topbar.tsx` | Logo + Search(⌘K) + Notification + Avatar + Org Switcher |
| Shell: Sidebar | `components/shell/Sidebar.tsx` | 5-8 主导航 + 折叠展开 + 未读角标 |
| Command Palette (⌘K) | `components/shell/CommandPalette.tsx` | cmdk 集成 |
| Page Header with Breadcrumb | `components/shell/PageHeader.tsx` | 标题 + 面包屑 + 操作按钮 |
| KPI Cards + Trend Chart | `components/dashboard/KPICards.tsx` | 3-5 卡片 + 折线 |
| Data Table with 分页/排序/筛选 | `components/data/DataTable.tsx` | TanStack Table 最佳实践 |
| Empty State | `components/common/EmptyState.tsx` | 插图 + 说明 + CTA |
| Loading Skeleton | `components/common/Skeleton.tsx` | 骨架屏 |
| Error State | `components/common/ErrorState.tsx` | 404/500/network 三态 |
| Toast System | `components/common/Toast.tsx` | 用 sonner |
| Settings Shell | `app/[locale]/(dashboard)/settings/layout.tsx` | Profile/Security/Billing/Notifications 分区 |
| Onboarding Checklist | `components/onboarding/Checklist.tsx` | 5 步引导 |

**实施清单**
- [ ] 每个必选模块：
  - 写到位（不是 placeholder）
  - 用 `@nebutra/ui` 现有组件
  - 含中英文 i18n key（从 `@nebutra/i18n` 消费）
  - 写 Storybook story
- [ ] 每个模块顶部注释：
  ```tsx
  /**
   * [LANDING-HERO]
   * Hero Section — 2026 best practice reference implementation.
   * Customize or replace. See: https://sailor.nebutra.com/modules/hero
   */
  ```
- [ ] 可选模块不生成，但留 `sailor add <module>` 路径（见 P1.1）

**重要原则**
- **这些骨架是 Nebutra 自己 landing-page / web 的骨架吗？不是！** 必须写在**模板专用目录**（如 `apps/landing-page/src/components/landing/` 是 template skeleton）
- Nebutra 自己的业务内容通过 `.templateignore` 剥离掉，只留骨架
- 但 Nebutra 自己**也在用**这套骨架（因为骨架就是最佳实践示范）
- 等价关系：**骨架 = 最佳实践样板 = Nebutra 自己产品的基础**

**参考文档**（必读）
- 用户提供的 `## 一、Landing Page 落地页` 详细规范（保存于此 handoff 前的会话）

---

## 3. P1 任务详解

### 3.1 `sailor add <feature>` CLI 命令 + 远程 registry

**现状**
- 仅规划，未实施
- shadcn 模式已定：remote registry JSON + diff + confirm

**目标**
```bash
# 脚手架后，按需增量
cd my-saas
sailor add queue --provider=upstash       # 加 packages/queue 配置 + .env
sailor add search --provider=meilisearch  # 加 packages/search + docker-compose
sailor add cache --provider=upstash-redis
sailor add vector --provider=pgvector
sailor add notifications --channel=email,push
sailor add webhooks --provider=svix
sailor add uploads --provider=s3
sailor add agents --example=chatbot       # Multi-Agent 编排示例
```

**实施清单**
- [ ] 新建 `packages/cli/src/commands/add.ts`（此命令属于 `packages/cli` 不是 `create-sailor`）
- [ ] 注册到 `packages/cli/src/index.ts`
- [ ] Feature registry JSON schema（每个 feature 一个 JSON）：
  ```json
  {
    "name": "queue",
    "description": "Message queue (QStash + BullMQ)",
    "providers": ["upstash-qstash", "bullmq"],
    "files": [
      { "path": "packages/queue/package.json", "content": "..." },
      { "path": "apps/web/src/lib/queue.ts", "content": "..." }
    ],
    "envVars": ["QSTASH_TOKEN", "QSTASH_SIGNING_KEY"],
    "dependencies": { "@upstash/qstash": "^2.0.0" },
    "hooks": {
      "after": "pnpm install"
    }
  }
  ```
- [ ] Remote registry 入口：`https://registry.nebutra.com/r/features/{name}.json`
- [ ] 本地缓存：`~/.sailor/cache/features/`
- [ ] Diff + confirm 逻辑：用 `diff` npm 包对比旧文件 / 新文件，用户逐文件 `overwrite / skip / merge`
- [ ] 支持 `--dry-run` / `--force` / `--yes`
- [ ] 单元测试：mock registry，跑完整 add flow

**参考**
- shadcn CLI 源码：https://github.com/shadcn-ui/ui/tree/main/packages/cli
- shadcn registry schema: https://ui.shadcn.com/schema/registry-item.json

---

### 3.2 双仓库 + CI 同步（B 方案）

**现状**
- 当前用 `.templateignore` 在 create-sailor clone 时运行时剥离
- 稳定但依赖 GitHub clone 全仓后再 prune

**目标**
`nebutra/sailor-template` 镜像仓库，**已经剥离干净**的模板源。用户 clone 更快、更稳定。

**实施清单**
- [ ] 在 Nebutra-Sailor 主仓创建 `.github/workflows/sync-template.yml`
  ```yaml
  name: Sync to sailor-template
  on:
    push:
      branches: [main]
  jobs:
    sync:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - name: Apply .templateignore
          run: tsx scripts/template-build.ts --out=/tmp/sailor-template
        - name: Push to sailor-template
          uses: cpina/github-action-push-to-another-repository@main
          with:
            source-directory: /tmp/sailor-template
            destination-github-username: nebutra
            destination-repository-name: sailor-template
            user-email: bot@nebutra.com
            target-branch: main
          env:
            API_TOKEN_GITHUB: ${{ secrets.GITHUB_PUSH_TOKEN }}
  ```
- [ ] 新建 `scripts/template-build.ts`：
  - Clone 当前 repo 到 `/tmp/work`
  - 应用 `.templateignore` 删除文件
  - 替换 `brand.config.ts` 为占位模板
  - 替换所有 `Nebutra` / `nebutra.com` 为模板占位符
  - `git init` 新 repo 并 push
- [ ] `packages/create-sailor/src/utils/git.ts` 改 `cloneTemplate()`：
  - 默认 clone `nebutra/sailor-template`（快，已剥离）
  - 保留 `--source=main` flag 可强制 clone 主仓（用于调试）
- [ ] 删除 create-sailor 里的运行时 `.templateignore` 应用逻辑（现在预剥离了）
- [ ] 准备 GitHub Secret `GITHUB_PUSH_TOKEN`（PAT with repo scope）
- [ ] 先手动验证一次 `template-build.ts` 本地运行 OK，再打开 CI

**风险**
- CI 失败时 template 和主仓不同步 → 加 Slack/email 告警
- template 仓库历史最好 force-push 单 commit（避免膨胀），或定期 squash

---

### 3.3 完整 provider 注册表扩展（20 → 60+）

**现状**
- `packages/ai-providers/src/meta.ts` 有 20 个
- 用户之前提供了 60+ 完整 provider 列表

**目标**
把完整列表补齐。

**实施清单**
- [ ] 补齐用户提供的完整 60+ provider 到 `meta.ts`
- [ ] 分类对齐：直接实验室 / 国内平台 / 云平台 / 推理加速 / 统一网关 / 多模态 / 本地部署 / 开发者生态
- [ ] 每个 provider 确认：
  - `status`: opencode / ai-sdk / cn-compatible / pending
  - `baseURL`（如果是 OpenAI-compatible）
  - `docs` URL 有效
  - `envVarPrefix` 和 `requiredEnvVars`
- [ ] 若 provider status 是 `pending` → 在 CLI 交互中标注"Preview"或"即将支持"
- [ ] 更新 registry.ts.template 和 .env.example.template 覆盖新增的 CN 平台
- [ ] 单元测试断言：`PROVIDERS.length >= 55`

---

## 4. P2 生态建设

### 4.1 `registry.nebutra.com` 静态站

**用途**
托管 feature registry JSON（被 `sailor add` 消费）

**实施清单**
- [ ] 新建独立 repo `nebutra/sailor-registry`
- [ ] 结构：
  ```
  /
  ├── r/
  │   ├── features/
  │   │   ├── queue.json
  │   │   ├── search.json
  │   │   ├── cache.json
  │   │   └── ...
  │   └── examples/
  │       ├── chatbot.json
  │       └── ...
  └── index.json    (manifest)
  ```
- [ ] Vercel 部署，`registry.nebutra.com` 绑定
- [ ] CI 校验：每个 JSON 合 schema + 所有 URL 可达

---

### 4.2 `sailor.nebutra.com` 文档站

**用途**
- Quick start
- CLI reference
- 产品页面模块 catalog（用户的 2026 规范落地页）
- Module API docs

**实施清单**
- [ ] 新建 `apps/sailor-docs`（Fumadocs / Mintlify / Next.js）
- [ ] 首页：one-liner `npm create sailor@latest` + 视频 demo
- [ ] 左侧导航：
  - Introduction
  - Getting Started
  - CLI Reference
  - Template Modules（landing + dashboard 骨架目录）
  - AI Providers
  - Deploy Targets
  - White-label
- [ ] 和 Nebutra 主站样式统一（复用 `@nebutra/ui`）

---

### 4.3 `.github/workflows/npm-publish.yml` 自动发布

**用途**
push tag → 自动 publish create-sailor + 占位包

**实施清单**
- [ ] GitHub Secret 配置：`NPM_TOKEN`（Granular + Bypass 2FA）
- [ ] 写 workflow，触发条件 `on: push: tags: ['v*']`
- [ ] 步骤：
  - Checkout
  - Setup Node + pnpm
  - `pnpm install`
  - `pnpm --filter create-sailor build`
  - `pnpm --filter create-sailor publish --no-git-checks`
  - GitHub Release 含 changelog
- [ ] 测试流程：本地 `git tag v1.0.1 && git push --tags` 验证

---

## 5. 已知限制 / 已知债务（供 Gemini 注意）

### 5.1 `renderTemplate` marker 过滤有限
- `packages/create-sailor/src/utils/providers.ts` 的 `filterRegistryEntries()` 是 stub
- `createProviderRegistry({ openai, anthropic, ... })` 对象字面量内的 key 没有真正按选择过滤
- 暂靠 marker 先剥离 import/instance，registry 对象里保留全部 key 可能编译报错
- **修复优先级：P0**（Gemini 第一批任务之一）

### 5.2 `.templateignore` 测试覆盖
- 当前 `pnpm template:check` 只断言 13 个 MUST_PRESERVE + 9 个 MUST_STRIP 路径
- 没覆盖 locale 变体、嵌套路径 edge cases
- 建议扩展 MUST_STRIP 到 30+ 条

### 5.3 `update-notifier` TTY 弹出时机
- 当前实现：scaffold 结束后检查，TTY 下弹
- Vercel CI / 非交互环境可能出现误弹
- 确认已经 guard 非 TTY（应该已经有，但 Gemini 建议再核对）

### 5.4 Windows 支持未测试
- cfonts banner 在 Windows cmd 需要自行验证
- `process.env.npm_config_user_agent` 检测 bun 在 Windows PowerShell 可能异常
- 建议在 CI matrix 加 Windows runner

---

## 6. 使用本文档的方式（给 Gemini 的说明）

1. **从 P0 开始**，不要跳过
2. 每个任务都附了 **实施清单**，按清单逐项 check
3. 不理解代码上下文时**必须**先阅读：
   - `CLAUDE.md`（项目顶级说明）
   - `WHITELABEL.md`
   - `TEMPLATE.md`
   - `packages/create-sailor/src/index.ts`（主流程）
   - `packages/ai-providers/src/meta.ts`（provider 元数据）
4. 修改任何包后**必须**运行：
   ```bash
   pnpm --filter <package> typecheck
   pnpm --filter create-sailor build
   pnpm template:check
   ```
5. 不要触动已发布的 `create-sailor@1.0.0` 里已有的核心能力（banner / CLI flag / SIGINT / .templateignore），只能扩展
6. 发版节奏建议：
   - 完成 P0.1 + P0.2 → 发 `create-sailor@1.1.0`
   - 完成 P0.3 + P1.1 → 发 `create-sailor@1.2.0` + `registry.nebutra.com` 上线
   - 完成 P1.2 + P1.3 → 发 `create-sailor@1.3.0`
   - P2 全完 → `create-sailor@2.0.0` + 正式官宣推文

---

## 7. 联系人 / 决策日志

| 决策项 | 状态 | 决策日期 |
|-------|------|---------|
| NextAuth 完全删除 | ✅ 已执行 | 2026-04-14 |
| cfonts block + 蓝青渐变 banner | ✅ 已执行 | 2026-04-14 |
| `.templateignore` 起步（方案 A） | ✅ 已执行 | 2026-04-14 |
| 双仓库 + CI 同步（方案 B） | 待 Gemini 执行 | — |
| 必选骨架 + 可选 `sailor add` | ✅ 架构已定 | 2026-04-14 |
| Payment providers | Stripe / Lemon / Creem / 微信 / 支付宝 | 2026-04-14 |
| AI SDK v5 + createOpenAICompatible | ✅ 已采用 | 2026-04-14 |
| Telemetry v1 不做 | ✅ 决策已定 | 2026-04-14 |
| 自定义 OpenAI-compatible endpoint 支持 | ✅ 架构已定 | 2026-04-14 |

---

## 8. 快速命令索引（Gemini 常用）

```bash
# Repo root
cd /Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor

# 运行模板剥离校验
pnpm template:check

# 验证 create-sailor 构建
pnpm --filter create-sailor build

# 完整 typecheck
pnpm -r typecheck

# 本地 dry-run 测 CLI
node packages/create-sailor/dist/index.js --dry-run my-test -y
NO_COLOR=1 node packages/create-sailor/dist/index.js --help

# 发布（需 npm token 且必须 Bypass 2FA）
npm config set //registry.npmjs.org/:_authToken=<TOKEN>
cd packages/create-sailor && npm publish --registry=https://registry.npmjs.org/
npm config delete //registry.npmjs.org/:_authToken

# 查看已发布版本
curl -s https://registry.npmjs.org/create-sailor | jq '.["dist-tags"]'
```

---

**Handoff 完成。Gemini 接手后请先读 P0.1，有问题回主对话反馈。**
