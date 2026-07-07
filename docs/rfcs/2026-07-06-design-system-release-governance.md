# RFC B2/B6/B7: 设计系统发布通道与视觉证据治理

Status: Proposed
Date: 2026-07-06
Dimensions: B2 设计系统/UI 组件成熟度, B6 测试盲区分析, B7 开发者体验

## Delta Scope

本提案覆盖 2026-06-28 之后设计系统治理的显著变化：token/theme 生成物扩大、`@nebutra/ui` 动画治理修复、design-docs runtime dependency prebuild、per-package `turbo.json`、视觉验收 workflow 分面化，以及品牌 token sync 校验增强。

参考的 UI 规则来源：Vercel Web Interface Guidelines, `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`。

本评审没有修改代码或配置。

## Current State

- `packages/design/theme/themes.css` 在本周期大幅变更，`packages/design/tokens/styles.css` 和 design-token/theme sync 脚本也随之变化。
- `scripts/verify-brand-token-sync.ts` 继续承担从 brand SSOT 到 runtime mirror 的同步校验，覆盖 tokens、theme、UI primitive、Tailwind preset、文档和 runtime font sources。
- `scripts/verify-theme-quality.mts` 独立用 `chroma-js` 检查主题 token 的必要角色、对比度和背景色低饱和约束。
- `packages/design/ui/src/components/animate-in.tsx` 明确尊重 reduced motion，并把动画 preset 收敛到品牌 motion token。
- `apps/design-docs/scripts/prepare-runtime-deps.mjs` 在 `predev/prebuild/pretypecheck` 前构建 `@nebutra/brand`、`@nebutra/icons`、`@nebutra/design-tokens` 运行时产物。
- `.github/workflows/visual-acceptance.yml` 将 design-docs 与 landing 拆成独立 job，并继续基于路径过滤触发；`apps/web` 产品视觉验收仍未纳入。
- `apps/landing-page/src/app/[lang]/(marketing)/get-license/LicenseWizard.tsx` 等商业关键路径仍存在 app-local card、button、emoji/icon 和 inline gradient 组合，质量主要靠局部测试而非 design-system primitive contract。

## Architectural Tradeoffs

Option A: 把设计系统治理升级为“发布通道”而不只是 token 同步。

- Pros: 更接近 Linear、Vercel、Supabase、Stripe 这类产品 UI 的成熟度：token、primitive、docs、visual proof 和 release notes 成为同一发布证据链。
- Cons: 会增加每次设计系统变更的准备成本和 CI 时间。

Option B: 继续依赖 token sync + 视觉验收的当前组合。

- Pros: 成本较低，现有脚本已经能抓住大量 drift。
- Cons: 不能证明 app-local UI 是否符合 primitive、accessibility、focus、text overflow、URL state 和 reduced-motion 规则。

Option C: 立即把所有 app-local UI 改造成 `@nebutra/ui` primitives。

- Pros: 快速降低视觉分叉。
- Cons: 变更面过大，容易把治理评审变成重构；也可能打断正在验证的商业路径。

Recommended direction: Option A in phases. 先定义设计系统发布证据，再让高价值 app-local UI 按触点迁移，避免无差别重构。

## Decision Information Needed

- 设计系统 release 的最小证据包：token diff、contrast report、storybook/design-docs registry、visual report、breaking-change note。
- 哪些 app-local UI 被允许临时存在，哪些必须迁回 `@nebutra/ui`。
- 产品关键路径是否需要 `visual:web`，尤其是 sign-up/access gate、license wizard、checkout-return、settings/security、tenant shell。
- `prepare-runtime-deps` 对本地 `pnpm dev:design`、`pretypecheck` 和 CI 缓存的耗时影响。
- 设计文档 registry manifest 是源文件、生成物，还是发布 artifact。
- 是否需要将 Vercel Web Interface Guidelines 的规则映射为 Nebutra 本地 policy：focus-visible、aria-label、text overflow、reduced motion、Intl、URL state。

## Proposed Decision Path

1. 定义 design-system release checklist，并要求每次 token/theme/primitive 变更都附带证据。
2. 选择 4 到 6 个产品 UI 状态纳入 `visual:web` 决策，而不是扩大成全量截图矩阵。
3. 对 app-local UI 建立迁移队列：商业路径优先，低风险 on-touch。
4. 为 `prepare-runtime-deps` 增加耗时和 cache 命中观测，避免把本地启动摩擦隐藏到 pre-script。

## Non-Goals

- 本 RFC 不重写任何组件或 token。
- 本 RFC 不削弱视觉验收、UI governance 或 accessibility 检查。
- 本 RFC 不要求一次性迁移所有 app-local UI。
