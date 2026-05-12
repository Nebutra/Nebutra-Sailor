# Hero 改造为 "Startup Agent OS" — 设计稿

**Date:** 2026-05-12
**Status:** Approved (awaiting implementation)
**Scope:** Landing page hero copy + page metadata only (no DOM/component changes)
**Out of scope:** Features / Pricing / About / 其他 section、视频背景、Mockup window、`create-sailor` CLI、`@nebutra/*` SDK 命名

---

## 1. 定位决策

短期(本次改动):**只换叙事,不动产品。** 把 Hero 的旗帜词从 *"The Next.js AI SaaS framework"* 改为 *"Startup Agent OS"*,产品本体不变。

长期(后续不在本 spec 范围):Sailor 将定位为 **出海版的 Vercel + Lovart + Supabase + Bolt.new + Lovable + Dub**,面向 Startup 提供一键 SaaS + 产品设计优化。本次文案保留"出海创始人"和"Agent OS"的钩子,但**不提前承诺**还没做出来的能力。

---

## 2. 改动清单

| # | 位置 | 文件 | Before | After |
|---|---|---|---|---|
| 1 | Hero H1 上半 | `apps/landing-page/messages/{en,zh,ja,de,fr}.json` → `hero.headline1` | "The Next.js AI SaaS framework" | **"Ship your Startup,"** |
| 2 | Hero H1 下半 | 同上 → `hero.headline2` | "for serious founders." | **"powered by Nebutra Agent OS."** |
| 3 | Hero 副标 | 同上 → `hero.subheadline` | "Build on a production-ready foundation with governed architecture and skip weeks of platform work. Optimized for AI coding agents & developers." | **"Skip weeks of platform work on a `<highlight>production-ready</highlight>` foundation with `<highlight>governed architecture</highlight>`, built for `<highlight>AI coding agents & founders</highlight>` going global."** |
| 4 | Hero 主 CTA | 同上 → `hero.ctaGetAccess` | "Get Your Free License" | **"Launch Your Startup"** |
| 5 | SEO/tab title | 同上 → `metadata.title` | "Nebutra Intelligence \| AI Native & SaaS Architecture" | **"Nebutra Agent OS \| The Startup Agent OS"** |
| 6 | SEO description | 同上 → `metadata.description` | "The next-generation engineering framework tailored for mainstream AI startups and enterprises..." | **"The Startup Agent OS for founders going global. Production-ready Next.js foundation with governed architecture, auth, billing, agents, and i18n — built for AI coding agents and serious teams."** |
| 7 | 硬编码 fallback | `apps/landing-page/src/app/[lang]/layout.tsx:74` | "Production-ready Next.js monorepo template for AI SaaS products" | **"The Startup Agent OS — ship global SaaS in days, not months"** |
| 8 | 死键清理 | 五份 JSON 的 `hero.badge` | "Nebutra Intelligence · Leading AI SaaS Foundation" | **删除**(顶层 `hero.badge` 全仓无 reader;features/page.tsx 用的是 `featuresPage.hero.badge`,独立) |

**不动的东西:**

- `HeroSection.tsx` 组件代码
- `HeroInstallPill.tsx`(`npx create-sailor@latest` 保留)
- 次 CTA `"Explore demo"` 保留
- `HeroBackgroundVideo`、`HeroMockupWindow`、`HeroLottieVisual` 等 visual 资产
- LCP 优化(H1 不裹 `AnimateIn`)结构

---

## 3. 五语言文案矩阵

### 3.1 英文(en.json)— 基准

```json
"hero": {
  "headline1": "Ship your Startup,",
  "headline2": "powered by Nebutra Agent OS.",
  "subheadline": "Skip weeks of platform work on a <highlight>production-ready</highlight> foundation with <highlight>governed architecture</highlight>, built for <highlight>AI coding agents & founders</highlight> going global.",
  "copyLabel": "Copy Command",
  "copiedLabel": "Copied",
  "ctaGetAccess": "Launch Your Startup",
  "ctaExploreDemo": "Explore demo",
  "pillCopied": "Copied"
},
"metadata": {
  "title": "Nebutra Agent OS | The Startup Agent OS",
  "description": "The Startup Agent OS for founders going global. Production-ready Next.js foundation with governed architecture, auth, billing, agents, and i18n — built for AI coding agents and serious teams."
}
```

### 3.2 中文(zh.json)

```json
"hero": {
  "headline1": "启航你的创业,",
  "headline2": "由 Nebutra Agent OS 驱动。",
  "subheadline": "基于 <highlight>生产就绪</highlight> 底座与 <highlight>受治理的架构</highlight> 开发,跳过数周平台工作。专为 <highlight>AI 编程智能体与出海创始人</highlight> 优化。",
  "copyLabel": "复制环境配置",
  "copiedLabel": "代码已复制",
  "ctaGetAccess": "启动我的创业",
  "ctaExploreDemo": "探索演示 Demo",
  "pillCopied": "已复制"
},
"metadata": {
  "title": "Nebutra Agent OS | 出海创业的起点",
  "description": "面向出海创始人的 Startup Agent OS。生产就绪的 Next.js 底座,受治理的架构,内置鉴权、计费、智能体与 i18n —— 为 AI 编程智能体与严肃团队打造。"
}
```

### 3.3 日文(ja.json)

```json
"hero": {
  "headline1": "あなたのスタートアップを、",
  "headline2": "Nebutra Agent OS で出航させよう。",
  "subheadline": "<highlight>本番運用可能</highlight> な基盤と <highlight>ガバナンス設計</highlight> 上で開発し、数週間のプラットフォーム作業をスキップ。<highlight>AI コーディングエージェントとグローバル展開を目指す創業者</highlight> のために最適化。",
  "ctaGetAccess": "スタートアップを起動"
},
"metadata": {
  "title": "Nebutra Agent OS | スタートアップ向け Agent OS",
  "description": "グローバル展開を目指す創業者のための Startup Agent OS。本番運用可能な Next.js 基盤、ガバナンス設計、認証、課金、エージェント、i18n を標準装備 —— AI コーディングエージェントと真剣なチームのために。"
}
```

### 3.4 德文(de.json)

```json
"hero": {
  "headline1": "Bring dein Startup an den Start —",
  "headline2": "powered by Nebutra Agent OS.",
  "subheadline": "Überspringe wochenlange Plattformarbeit mit einer <highlight>produktionsreifen</highlight> Grundlage und <highlight>geprüfter Architektur</highlight>, gebaut für <highlight>AI-Coding-Agents und global agierende Gründer</highlight>.",
  "ctaGetAccess": "Startup starten"
},
"metadata": {
  "title": "Nebutra Agent OS | Das Startup Agent OS",
  "description": "Das Startup Agent OS für global agierende Gründer. Produktionsreifes Next.js-Fundament mit geprüfter Architektur, Auth, Billing, Agents und i18n — gebaut für AI-Coding-Agents und ernsthafte Teams."
}
```

### 3.5 法文(fr.json)

```json
"hero": {
  "headline1": "Lancez votre Startup,",
  "headline2": "propulsée par Nebutra Agent OS.",
  "subheadline": "Sautez des semaines de travail d'infrastructure grâce à une base <highlight>prête pour la production</highlight> et une <highlight>architecture gouvernée</highlight>, conçue pour les <highlight>agents de code IA et les fondateurs visant l'international</highlight>.",
  "ctaGetAccess": "Lancer ma startup"
},
"metadata": {
  "title": "Nebutra Agent OS | Le Startup Agent OS",
  "description": "Le Startup Agent OS pour les fondateurs qui visent l'international. Base Next.js prête pour la production, architecture gouvernée, auth, facturation, agents et i18n inclus — conçu pour les agents de code IA et les équipes sérieuses."
}
```

---

## 4. 实施顺序

1. 改 `messages/en.json`(基准)— hero + metadata,删 `hero.badge`
2. 改 `messages/zh.json` 同步
3. 改 `messages/ja.json` 同步
4. 改 `messages/de.json` 同步
5. 改 `messages/fr.json` 同步
6. 改 `apps/landing-page/src/app/[lang]/layout.tsx:74` 硬编码 fallback
7. `pnpm --filter @nebutra/landing-page typecheck` — 确认 `next-intl` 类型对得上
8. 启动 dev server,过五个语言路由

---

## 5. 验证清单

- [ ] `pnpm --filter @nebutra/landing-page dev` 起得来
- [ ] `/en` H1 显示 "Ship your Startup, powered by Nebutra Agent OS."
- [ ] `/zh` `/ja` `/de` `/fr` 同步落地各自翻译
- [ ] 浏览器 tab 文本 = "Nebutra Agent OS | The Startup Agent OS"(en)
- [ ] `<highlight>` 标签渲染为 `var(--brand-gradient)` 蓝→青渐变(沿用现有 `t.rich` 逻辑)
- [ ] 主 CTA 显示 "Launch Your Startup" 且链接仍指 `/get-license`
- [ ] `rg "AI SaaS framework|Get Your Free License|Nebutra Intelligence \| AI Native"` 在 `apps/landing-page` 内无残留
- [ ] `rg "hero\.badge"` 在仓库内无 reader(features 页的 `featuresPage.hero.badge` 不计)
- [ ] LCP 不退化:H1 文本在 SSR HTML 首帧出现,不被 `AnimateIn` 包裹

---

## 6. 风险 & 回滚

**风险等级:** 低 —— 纯文案/JSON 改动,无 schema/路由/组件结构变动。

**回滚:** `git revert` 单个 commit 即可。

**已知边界:**

- 其他 section(Features / Pricing / About / FAQ 等)仍以"AI SaaS Foundation"叙事写就。本次**有意**不动,留待长期叙事重构时统一处理(参见上面 §1)。如果短期内不动看起来割裂,可以另起一个 follow-up spec。
- SEO:`metadata.title` 改了之后,搜索引擎重新索引需要 1-2 周。OpenGraph 图片(如果存在硬编码标题)不在本次范围,需另外处理。

---

## 7. YAGNI 排除

- 不加新的视觉 badge 元素
- 不改 install pill 命令或样式
- 不重写 SEO 结构化数据
- 不动其他 section
- 不动 `create-sailor` CLI 包名或 npm 描述
- 不做 A/B 测试 / feature flag(直接全量改)
