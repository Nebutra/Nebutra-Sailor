# `@nebutra/ui` — shadcn-style Registry 改造蓝图

**版本:** 2026-05-09
**状态:** 设计稿（read-only blueprint，不动代码）

---

## 1. 现状盘点

### 1.1 目录结构与组件统计

`packages/design/ui/src/` 完整子目录清单与各层组件数：

| 子目录 | 描述 | 组件/导出数 |
|--------|------|------------|
| `components/` | Lobe UI 薄包装 + AI 组件 | ~8 个具名导出组 (LobeUI re-exports + ai-prompt-box, animate-in, ascii-text, changelog-widget, onboarding-checklist, team-chat) |
| `primitives/` | 核心设计系统原语 — 最大层 | ~140 个具名导出 (按 index.ts 统计) |
| `patterns/` | 复合模式组件 | 3 组 (Card, CommandBox, Terminal 复合组件) |
| `layout/` | 页面级包装组件 | 8 个 (Card, Container, EmptyState, ErrorState, LoadingState, PageHeader, Section, DesignSystemProvider) |
| `layouts/` | 营销/产品 layout 模式 | 4 个 (BentoGrid, SectionContainer, SectionTheme, ThemedSection) |
| `hooks/` | 自定义 React Hooks | 4 个 (DwellHint, useMediaQuery, useReducedMotion, useScrollDwell) |
| `utils/` | 工具函数 | 6 个 (cn, breakpoints, brand-colors) |
| `theme/` | Lobe UI 主题桥接 | 2 个 (NebutraThemeProvider, ThemeMode) |
| `typography/` | 字体系统 | ~15 个 (fontFamilies, typeStyles, getGoogleFontsUrl 等) |
| `icons/` | 选择性图标 re-export | ~15 个 (来自 lucide-react + @lobehub/icons) |
| `tokens/` | 内部 motion token | motion variants (内部用) |
| `styles/` | CSS 全局 | 全局 keyframes, CSS 变量扩展 |
| `decorations/` | 视觉装饰 | 未 index 导出，内部用 |
| `marketing/` | 营销区块 | 未 index 导出，无结构化入口 |
| `navigation/` | 导航组件 | 未 index 导出 |

**消费方：**
- `apps/web`: `@nebutra/ui/components` + `@nebutra/ui/primitives` + `@nebutra/ui/layout` + `@nebutra/ui/utils`
- `apps/landing-page`: `@nebutra/ui/primitives` + `@nebutra/ui/layouts` + `@nebutra/ui/typography`
- `apps/storybook`: 全部 subpath

### 1.2 外部依赖图谱 (primitives 层)

| 依赖 | 用途 | 层级归属 |
|------|------|---------|
| `@base-ui/react` | command-menu dialog 底层 | primitives |
| `framer-motion` / `motion` | AnimateIn, AnimatedBeam, MagicCard 等 | primitives + components |
| `recharts` | ChartContainer | primitives |
| `cobe` | Globe (WebGL 地球) | primitives |
| `canvas-confetti` | Confetti | primitives |
| `react-tweet` | XPostCard | primitives |
| `react-syntax-highlighter` | CodeBlock | primitives |
| `date-fns` | GitHubCalendar | primitives |
| `dotted-map` | DottedWorldMap | primitives |
| `cmdk` | Command | primitives |
| `embla-carousel-react` | Carousel | primitives |
| `input-otp` | InputOTP | primitives |
| `react-resizable-panels` | Resizable | primitives |
| `vaul` | Drawer | primitives |
| `sonner` | Toast | primitives |
| `@lobehub/ui` | AI 组件集合 | components |
| `@nebutra/brand` | brandSpring, emerge, motionVariants | primitives (animate-in) |

### 1.3 核心问题诊断

1. **primitives 层是大杂烩。** 同一个 `index.ts` 同时包含：纯 Radix headless 包装（`Button`, `Input`, `Dialog`）、高度特化的 AI 组件（`AgentPlan`, `AssistedPasswordConfirmation`）、重度装饰性组件（`Globe`, `FlickeringGrid`, `StarsCanvas`, `HexGrid`）、营销专用组件（`PricingCard`, `FeatureCard`, `BentoGrid`, `XPostCard`）。
2. **`components/` 与 `primitives/` 边界模糊。** CLAUDE.md 的层级表将 Button / 数据表 / 营销 section 全部指向 `src/components/`，但实际上这三类都在 `primitives/`。
3. **包体积风险。** `package.json` 有 30+ 直接 dependencies，其中 `three` + `@react-three/fiber` (optional)、`cobe`、`@paper-design/shaders-react` 均为重型 WebGL 依赖，被拉入所有消费方。
4. **用户无法 fork 单个组件。** 营销和业务组件高度特化，但用户想改样式时必须 monkey-patch 整个包。

---

## 2. 拆分准则

### 2.1 判定原则

**保留 npm 依赖（Keep as package）的条件：**
- 组件是薄的 Radix headless 包装，升级语义稳定
- 跨 app 强共享且不期望被客户改动
- 内部实现细节不应暴露给消费方（如 provider、bridge 组件）
- Token 系统本身（CSS 变量层）

**改为 registry copy-paste 的条件：**
- 组件含有明显的视觉意见（颜色、动画参数、排版尺寸）
- 客户场景中极可能需要改动内部逻辑（不止 className）
- 具有重型第三方依赖（WebGL、Canvas、外部 API），应按需引入
- 营销/品牌性组件，不同客户差异大
- 参考：shadcn/ui 官方定位 — "Not a component library. It's a collection of re-usable components that you can copy and paste"

### 2.2 判定 Flowchart

```
                    ┌─────────────────────────────────┐
                    │ 是否是 Radix / Base UI headless  │
                    │ 的薄包装，只有 className 意见？   │
                    └─────────────────────────────────┘
                              │         │
                             YES        NO
                              │         │
                              ▼         ▼
                    ┌──────────────┐  ┌──────────────────────────┐
                    │ 是否跨所有   │  │ 是否包含重型外部依赖       │
                    │ app 强共享？ │  │ (WebGL/Canvas/外部API)？  │
                    └──────────────┘  └──────────────────────────┘
                        │    │              │           │
                       YES   NO            YES         NO
                        │    │              │           │
                        ▼    ▼              ▼           ▼
                    [npm]  [registry]   [registry]  ┌──────────────────┐
                                                    │ 客户是否经常需要  │
                                                    │ 改内部样式逻辑？  │
                                                    └──────────────────┘
                                                         │        │
                                                        YES       NO
                                                         │        │
                                                         ▼        ▼
                                                    [registry] [npm]
```

---

## 3. 完整组件分类表

### TIER A — 保留 npm 依赖（core primitives）

Radix headless 包装、Token 驱动、跨所有 app 一致使用、不期望 fork。

| 组件 | 文件 | 外部依赖 | 理由 |
|------|------|---------|------|
| `Button` / `ButtonLink` | `primitives/button.tsx` | cva, 内部 Slot | Radix Slot 模式，API 稳定，核心交互原语 |
| `Input` | `primitives/input.tsx` | 纯 HTML | 无依赖，token 驱动 |
| `Label` | `primitives/label.tsx` | @radix-ui/label | headless |
| `Checkbox` / `CheckboxGroup` | `primitives/checkbox-group.tsx` | @radix-ui | headless |
| `RadioGroup` / `RadioGroupItem` | `primitives/radio-group.tsx` | @radix-ui | headless |
| `Select` (all parts) | `primitives/select.tsx` | @radix-ui | headless |
| `Dialog` (all parts) | `primitives/dialog.tsx` | @radix-ui | headless |
| `Tooltip` (all parts) | `primitives/tooltip.tsx` | @radix-ui | headless |
| `Popover` | `primitives/popover.tsx` | @radix-ui | headless |
| `Accordion` (all parts) | `primitives/accordion.tsx` | @radix-ui | headless |
| `Tabs` (all parts) | `primitives/tabs.tsx` | @radix-ui | headless |
| `Switch` | `primitives/switch.tsx` | @radix-ui | headless |
| `Slider` | `primitives/slider.tsx` | @radix-ui | headless |
| `Separator` | `primitives/separator.tsx` | @radix-ui | headless |
| `Avatar` / `AvatarFallback` / `AvatarImage` | `primitives/avatar.tsx` | @radix-ui | headless |
| `Badge` / `badgeVariants` | `primitives/badge.tsx` | cva | 轻量，token 驱动 |
| `Form` / `FormItem` 等 | `primitives/form.tsx` | react-hook-form | 跨 app 表单基础层 |
| `Sheet` (all parts) | `primitives/sheet.tsx` | @radix-ui | headless |
| `Drawer` | `primitives/drawer.tsx` | vaul | 稳定，轻量 peer |
| `DropdownMenu` | `primitives/dropdown-menu.tsx` | @radix-ui | headless |
| `ContextMenu` | `primitives/context-menu.tsx` | @radix-ui | headless |
| `HoverCard` | `primitives/hover-card.tsx` | @radix-ui | headless |
| `Menubar` | `primitives/menubar.tsx` | @radix-ui | headless |
| `NavigationMenu` | `primitives/navigation-menu.tsx` | @radix-ui | headless |
| `Collapsible` | `primitives/collapsible.tsx` | @radix-ui | headless |
| `Toggle` / `ToggleGroup` | `primitives/toggle.tsx` | @radix-ui | headless |
| `AspectRatio` | `primitives/aspect-ratio.tsx` | @radix-ui | headless |
| `Resizable` | `primitives/resizable.tsx` | react-resizable-panels | 轻量 |
| `Skeleton` | `primitives/skeleton.tsx` | 纯 CSS | 轻量 |
| `Spinner` / `Loader` | `primitives/loader.tsx` | 纯 CSS | 轻量 |
| `Progress` | `primitives/progress.tsx` | @radix-ui | headless |
| `Pagination` | `primitives/pagination.tsx` | 内部 | 稳定模式 |
| `Table` (all parts) | `primitives/table.tsx` | 纯 HTML | 无依赖 |
| `Card` (shadcn style) | `primitives/card.tsx` | 纯 CSS | 稳定，轻量 |
| `Alert` | `primitives/alert.tsx` | cva | 稳定 |
| `AlertDialog` | `primitives/alert-dialog.tsx` | @radix-ui | headless |
| `Command` | `primitives/command.tsx` | cmdk | 标准 Cmd palette |
| `Textarea` | `primitives/textarea.tsx` | 纯 HTML | 无依赖 |
| `InputOTP` | `primitives/input-otp.tsx` | input-otp | 稳定 peer |
| `Combobox` | `primitives/combobox.tsx` | cmdk | 稳定 |
| `Carousel` | `primitives/carousel.tsx` | embla-carousel-react | 稳定 peer |
| `Breadcrumb` | `primitives/breadcrumb.tsx` | 纯 HTML | 无依赖 |
| `Kbd` | `primitives/kbd.tsx` | 纯 HTML | 无依赖 |
| `ErrorBoundary` | `primitives/error-boundary.tsx` | 纯 React | 跨 app 基础 |

**layout / providers（始终保留 npm）：**

| 组件 | 文件 | 理由 |
|------|------|------|
| `DesignSystemProvider` | `layout/DesignSystemProvider.tsx` | Provider，不应被 fork |
| `NebutraThemeProvider` | `theme/provider.tsx` | Lobe UI bridge，不应被 fork |
| `Container` | `layout/Container.tsx` | Token 绑定，跨 app 一致 |
| `PageHeader` | `layout/PageHeader.tsx` | Dashboard 共享 |
| `EmptyState` / `LoadingState` / `ErrorState` | `layout/` | Dashboard 共享状态页 |
| `Section` | `layout/Section.tsx` | 轻量 layout |
| `SectionContainer` | `layouts/SectionContainer.tsx` | 营销 layout 骨架 |

---

### TIER B — 改为 Registry copy-paste

#### B1: 动画 / 视觉装饰（高定制需求 + framer-motion 强绑定）

| 组件 | 文件 | 重型依赖 | registry 名称 |
|------|------|---------|--------------|
| `AnimateIn` / `AnimateInGroup` | `primitives/animate-in.tsx` | framer-motion, @nebutra/brand | `animate-in` |
| `AnimatedBeam` | `primitives/animated-beam.tsx` | framer-motion | `animated-beam` |
| `AnimatedCircularProgressBar` | `primitives/animated-circular-progress-bar.tsx` | framer-motion | `animated-circular-progress-bar` |
| `AnimatedGradientText` | `primitives/animated-gradient-text.tsx` | 纯 CSS | `animated-gradient-text` |
| `AnimatedGroup` | `primitives/animated-group.tsx` | framer-motion | `animated-group` |
| `AnimatedHikeCard` | `primitives/animated-hike-card.tsx` | framer-motion | `animated-hike-card` |
| `AnimatedList` | `primitives/animated-list.tsx` | framer-motion | `animated-list` |
| `AnimatedShinyText` | `primitives/animated-shiny-text.tsx` | 纯 CSS | `animated-shiny-text` |
| `AuroraText` | `primitives/aurora-text.tsx` | CSS animation | `aurora-text` |
| `BorderTrail` | `primitives/border-trail.tsx` | framer-motion | `border-trail` |
| `BubbleText` | `primitives/bubble-text.tsx` | framer-motion | `bubble-text` |
| `CanvasRevealEffect` | `primitives/canvas-reveal-effect.tsx` | three.js (optional) | `canvas-reveal-effect` |
| `CardSpotlight` | `primitives/card-spotlight.tsx` | 纯 CSS | `card-spotlight` |
| `DisplayCards` | `primitives/display-cards.tsx` | framer-motion | `display-cards` |
| `DitheringBackground` / `DitheringShader` | `primitives/dithering-*.tsx` | @paper-design/shaders-react | `dithering-shader` |
| `DotPattern` | `primitives/dot-pattern.tsx` | 纯 SVG | `dot-pattern` |
| `FlickeringGrid` | `primitives/flickering-grid.tsx` | Canvas API | `flickering-grid` |
| `GlowingEffect` | `primitives/glowing-effect.tsx` | framer-motion | `glowing-effect` |
| `GradientAnimatedText` | `primitives/gradient-animated-text.tsx` | framer-motion | `gradient-animated-text` |
| `GrainGradientBackground` | `primitives/grain-gradient-background.tsx` | Canvas/SVG | `grain-gradient-bg` |
| `GridPatternCard` | `primitives/grid-pattern-card.tsx` | 纯 SVG | `grid-pattern-card` |
| `LightRays` | `primitives/light-rays.tsx` | Canvas | `light-rays` |
| `LineShadowText` | `primitives/line-shadow-text.tsx` | 纯 CSS | `line-shadow-text` |
| `MagicCard` | `primitives/magic-card.tsx` | framer-motion | `magic-card` |
| `MeshGradientBg` | `primitives/mesh-gradient-bg.tsx` | Canvas | `mesh-gradient-bg` |
| `NeuroNoiseBg` | `primitives/neuro-noise-bg.tsx` | @paper-design/shaders-react | `neuro-noise-bg` |
| `NoisePatternCard` | `primitives/noise-pattern-card.tsx` | Canvas | `noise-pattern-card` |
| `ProgressiveBlur` | `primitives/progressive-blur.tsx` | framer-motion | `progressive-blur` |
| `ShineBorder` | `primitives/shine-border.tsx` | 纯 CSS | `shine-border` |
| `StarsCanvas` | `primitives/stars-canvas.tsx` | Canvas API | `stars-canvas` |
| `TextLoop` | `primitives/text-loop.tsx` | framer-motion | `text-loop` |
| `TextScramble` | `primitives/text-scramble.tsx` | 纯 JS | `text-scramble` |
| `TextShimmer` | `primitives/text-shimmer.tsx` | 纯 CSS | `text-shimmer` |
| `WarpBackground` | `primitives/warp-background.tsx` | framer-motion | `warp-background` |
| `WaveAnimation` / `WavesBg` | `primitives/wave-*.tsx` | Canvas | `waves-bg` |
| `WordFadeIn` | `primitives/word-fade-in.tsx` | framer-motion | `word-fade-in` |
| `ScrollVelocity` | `primitives/scroll-velocity.tsx` | framer-motion | `scroll-velocity` |

#### B2: 数据可视化 / 重型（WebGL / Canvas / 外部 API）

| 组件 | 文件 | 重型依赖 | registry 名称 |
|------|------|---------|--------------|
| `Globe` | `primitives/globe.tsx` | cobe (WebGL) | `globe` |
| `DottedMap` | `primitives/dotted-map.tsx` | dotted-map | `dotted-map` |
| `DottedWorldMap` | `primitives/dotted-world-map.tsx` | dotted-map | `dotted-world-map` |
| `HexGrid` | `primitives/hex-grid.tsx` | 纯 SVG | `hex-grid` |
| `Chart` (recharts wrapper) | `primitives/chart.tsx` | recharts | `chart` |
| `GitHubCalendar` | `primitives/github-calendar.tsx` | date-fns | `github-calendar` |
| `Gauge` | `primitives/gauge.tsx` | SVG math | `gauge` |
| `SliderNumberFlow` | `primitives/slider-number-flow.tsx` | @number-flow/react | `slider-number-flow` |
| `XPostCard` | `primitives/x-post-card.tsx` | react-tweet | `x-post-card` |
| `AsciiText` | `components/ascii-text.tsx` | react-ascii-text | `ascii-text` |

#### B3: 营销专用（高度特化视觉，经常需要改）

| 组件 | 文件 | registry 名称 |
|------|------|--------------|
| `BentoGrid` / `BentoCard` | `primitives/bento-grid.tsx` | `bento-grid` |
| `PricingCard` (compound) | `primitives/pricing-card.tsx` | `pricing-card` |
| `FeatureCard` / `FeatureCardHeader` / `DualModeImage` | `primitives/feature-card.tsx` | `feature-card` |
| `FeatureArrowCard` | `primitives/feature-arrow-card.tsx` | `feature-arrow-card` |
| `FeatureCheckItem` | `primitives/feature-check-item.tsx` | `feature-check-item` |
| `FeatureIconItem` | `primitives/feature-icon-item.tsx` | `feature-icon-item` |
| `GridFeatureCard` | `primitives/grid-feature-card.tsx` | `grid-feature-card` |
| `Announcement` | `primitives/announcement.tsx` | `announcement` |
| `AvatarCircles` | `primitives/avatar-circles.tsx` | `avatar-circles` |
| `ThemedSection` / `SectionTheme` | `layouts/SectionTheme.tsx` | `themed-section` |
| `InfiniteSlider` | `primitives/infinite-slider.tsx` | framer-motion | `infinite-slider` |
| `ExpandableTabs` | `primitives/expandable-tabs.tsx` | framer-motion | `expandable-tabs` |
| `ChoiceBox` | `primitives/choicebox.tsx` | cva | `choicebox` |
| `InteractiveFrostedGlassCard` | `primitives/interactive-frosted-glass-card.tsx` | framer-motion | `frosted-glass-card` |

#### B4: Dashboard / SaaS 业务组件

| 组件 | 文件 | registry 名称 |
|------|------|--------------|
| `KpiCard` | `primitives/kpi-card.tsx` | `kpi-card` |
| `MetricCard` | `primitives/metric-card.tsx` | `metric-card` |
| `BulkActionBar` | `primitives/bulk-action-bar.tsx` | `bulk-action-bar` |
| `NotificationMessageList` | `primitives/notification-message-list.tsx` | `notification-message-list` |
| `Stepper` | `primitives/stepper.tsx` | `stepper` |
| `StatusBadge` | `primitives/status-badge.tsx` | `status-badge` |
| `ColorBadge` | `primitives/color-badge.tsx` | `color-badge` |
| `ReactionChip` | `primitives/reaction-chip.tsx` | `reaction-chip` |
| `FeedbackWidget` | `primitives/feedback.tsx` | `feedback-widget` |
| `Entity` | `primitives/entity.tsx` | `entity` |
| `Highlighter` | `primitives/highlighter.tsx` | `highlighter` |
| `AvatarSmartGroup` | `primitives/avatar-smart-group.tsx` | `avatar-smart-group` |
| `AvatarExtended` | `primitives/avatar-extended.tsx` | `avatar-extended` |
| `ContextCard` | `primitives/context-card.tsx` | `context-card` |
| `ConfirmDialog` | `primitives/confirm-dialog.tsx` | `confirm-dialog` |
| `EmptyState` (primitives) | `primitives/empty-state.tsx` | `empty-state` |
| `Enable2FACard` | `primitives/enable-2fa-card.tsx` | `enable-2fa-card` |
| `AssistedPasswordConfirmation` | `primitives/assisted-password-confirmation.tsx` | `assisted-password-confirmation` |
| `PaginationControl` | `primitives/pagination-control.tsx` | `pagination-control` |
| `MultipleSelector` | `primitives/multiple-selector.tsx` | `multiple-selector` |
| `RadioGroupCard` / `RadioGroupStacked` | `primitives/radio-group-*.tsx` | `radio-group-card` |

#### B5: 展示型 UI 模拟（Device mockups / Terminals）

| 组件 | 文件 | registry 名称 |
|------|------|--------------|
| `SafariBrowser` | `primitives/safari.tsx` | `browser-mockup` |
| `MacbookPro` | `primitives/macbook-pro.tsx` | `macbook-mockup` |
| `IPhoneMockup` | `primitives/iphone-mockup.tsx` | `iphone-mockup` |
| `Terminal` (animated) | `primitives/terminal.tsx` | `terminal-animated` |
| `BrowserMockup` | `primitives/browser-mockup.tsx` | `browser-mockup-2` |
| `VideoPlayer` | `primitives/video-player.tsx` | `video-player` |
| `VideoText` | `primitives/video-text.tsx` | `video-text` |
| `CodeBlock` | `primitives/code-block.tsx` | `code-block` |
| `GithubInlineDiff` | `primitives/github-inline-diff.tsx` | `github-inline-diff` |

#### B6: AI / 业务专用

| 组件 | 文件 | registry 名称 |
|------|------|--------------|
| `AIPromptBox` | `components/ai-prompt-box.tsx` | `ai-prompt-box` |
| `OnboardingChecklist` | `components/onboarding-checklist.tsx` | `onboarding-checklist` |
| `TeamChat` | `components/team-chat.tsx` | `team-chat` |
| `AgentPlan` | `primitives/agent-plan.tsx` | `agent-plan` |
| `CommandMenu` | `primitives/command-menu.tsx` | `command-menu` |
| `ChangelogWidget` | `components/changelog-widget.tsx` | `changelog-widget` |

#### B7: Patterns 层（全部）

| 组件 | 文件 | registry 名称 |
|------|------|--------------|
| `Card` (compound) | `patterns/Card.tsx` | `compound-card` |
| `CommandBox` | `patterns/CommandBox.tsx` | `command-box` |
| `Terminal` (compound) | `patterns/Terminal.tsx` | `terminal-compound` |

---

## 4. Registry 服务架构

### 4.1 方案选型：shadcn CLI v2 自定义 Registry

**推荐：shadcn CLI v2 的自定义 registry（JSON manifest）**

理由：
1. shadcn CLI 2025 推出完整的自定义 registry 规范，支持托管 `registry.json` + `shadcn add <url>`
2. 无需自维护 CLI；生态已被 Radix Themes、Origin UI 验证
3. manifest 中的 `cssVars` 字段可以随组件推送 token 片段，与 `@nebutra/tokens` 兼容
4. 不影响 monorepo 内部 npm 依赖路径

**不推荐自建 registry 服务**：维护成本高，shadcn 协议已是 2026 事实标准。

### 4.2 Hosting 方案

**推荐：Sailor Docs site（apps/design-docs）+ Vercel 部署**

```
https://ui.nebutra.com/registry.json          ← registry index
https://ui.nebutra.com/r/[component-name].json ← 单组件 manifest
```

理由：
- `apps/design-docs` 已是 Next.js 16 + Fumadocs，可直接添加 API route 提供 JSON
- Vercel 自动 CDN 缓存
- 与 Storybook 同源
- 避免独立 GitHub Pages 维护负担

备选：GitHub Pages（POC 阶段更简单）。

### 4.3 Manifest Schema

**单组件 entry（以 `bento-grid` 为例）：**

```json
{
  "name": "bento-grid",
  "type": "registry:ui",
  "title": "Bento Grid",
  "description": "Responsive bento-style feature grid with hover-reveal CTAs.",
  "author": "Nebutra",
  "dependencies": [
    "lucide-react",
    "class-variance-authority"
  ],
  "registryDependencies": [
    "button",
    "card"
  ],
  "files": [
    {
      "path": "components/ui/bento-grid.tsx",
      "type": "registry:ui",
      "content": "... (full component source)"
    }
  ],
  "cssVars": {
    "light": {
      "--bento-radius": "var(--radius-xl)"
    },
    "dark": {}
  },
  "tailwind": {
    "config": {
      "theme": {
        "extend": {}
      }
    }
  },
  "meta": {
    "nebutraTokens": ["--neutral-1", "--neutral-7", "--blue-9"],
    "nebutraLayer": "marketing"
  }
}
```

**Registry index：**

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "nebutra-ui",
  "homepage": "https://ui.nebutra.com",
  "items": [
    { "name": "bento-grid", "type": "registry:ui", "title": "Bento Grid" },
    { "name": "pricing-card", "type": "registry:ui", "title": "Pricing Card" },
    { "name": "globe", "type": "registry:ui", "title": "Globe (WebGL)", "dependencies": ["cobe"] },
    { "name": "chart", "type": "registry:ui", "title": "Chart", "dependencies": ["recharts"] }
  ]
}
```

### 4.4 组件文件生成流程

`packages/design/ui/scripts/build-registry.ts` 读取 `primitives/*.tsx` → 输出 `registry/*.json`，通过 Turborepo pipeline 在 build 时自动运行，由 `apps/design-docs/public/r/` serve。

---

## 5. 平滑迁移路线

### 5.1 双轨并行

**现有 npm 导入保持不变，registry 作为新增分发渠道。**

```ts
// 继续有效
import { BentoGrid } from "@nebutra/ui/primitives"

// 新增 — 用于外部 copy-paste
npx shadcn@latest add https://ui.nebutra.com/r/bento-grid.json
```

内部 apps 不做 import 路径改动，registry 服务于：
1. 客户/外部开发者 copy-paste
2. 新功能首发走 registry，成熟后再决定是否收回 npm

### 5.2 Codemod 策略（备用）

将来内部 apps 本地化组件时，用 jscodeshift 或 ts-morph 改写 import 路径。当前 apps 内 import 数量 < 200 处，codemod 风险低。

### 5.3 双轨期时间线

```
Month 0-1:  搭建 registry 基础设施
Month 1-2:  首批 10 个 registry 组件上线（POC）
Month 2-4:  营销/装饰/数据可视化类组件全部迁至 registry
Month 4-6:  内部 apps 评估是否本地化高定制组件
Month 6+:   npm 包收窄至 TIER A，TIER B 标记 @deprecated
```

### 5.4 Storybook 双源

```
apps/storybook/src/stories/
  primitives/           ← TIER A npm 组件 stories
  registry/             ← TIER B registry 组件 stories
```

Build script 生成 registry JSON 时从同一源头读取，Storybook 永远展示最新版本，registry JSON 与 Storybook 同步。

---

## 6. Token / Theme 兼容

### 6.1 Copy 出去的组件如何继续消费 `var(--neutral-X)`

Copy-paste 后的 CSS 变量在任何正确安装 `@nebutra/tokens` 的项目中都自动工作。

对于外部消费者（非 Nebutra monorepo）：

**方案 A：** Registry manifest 的 `cssVars` 字段附带 fallback 值，shadcn CLI 自动写入 app `globals.css`：

```json
"cssVars": {
  "light": {
    "--neutral-1": "#ffffff",
    "--neutral-7": "#d1d5db",
    "--neutral-12": "#111827",
    "--blue-9": "#0033FE",
    "--brand-gradient": "135deg, #0033FE 0%, #0BF1C3 100%"
  },
  "dark": {
    "--neutral-1": "#0a0a0a",
    "--neutral-7": "#374151",
    "--neutral-12": "#f9fafb",
    "--blue-9": "#3d5afe"
  }
}
```

**方案 B（推荐配合 A）：** 提供独立的 `registry:theme` 条目 `nebutra-tokens`：

```bash
npx shadcn@latest add https://ui.nebutra.com/r/nebutra-tokens.json
```

只输出 CSS 变量到 `globals.css`，不产 TSX。

### 6.2 静态扫描

Build script 在生成 registry JSON 时检测硬编码 hex 值并 warn，防止违规组件被发布。

---

## 7. 风险与缓解

### 7.1 安全补丁传播

**问题：** 用户 fork 后，原始版本修复漏洞，用户不知道。

**缓解：**
1. 每个 registry entry 带 `version` 字段
2. `apps/design-docs` changelog 自动 diff 组件变更
3. 严重漏洞标记 `"security": true`
4. GitHub Security Advisory 强制通知

**局限：** Copy-paste 模式本质无法强推更新，与 shadcn 一致。

### 7.2 命名空间冲突

**缓解：**
1. 默认目标路径可在 `components.json` 配置
2. Nebutra 组件名加前缀区分
3. 文档明确与 shadcn/ui overlap 列表

### 7.3 测试覆盖继承

**策略：**
1. Registry JSON `files` 数组支持测试文件（`type: "registry:test"`）
2. 每个 registry 组件附带 render test + snapshot
3. 内部 `packages/ui` vitest 维持 80% 覆盖

### 7.4 Bundle 体积

Registry 模式天然解决：copy `button.tsx` 后只需 `class-variance-authority`，不需要 `cobe` / `three` / `recharts`。

---

## 8. POC 路径：第一个上 Registry 的组件

**推荐：`bento-grid`**

理由：
1. 完美符合 registry 判定条件
2. 依赖干净（`lucide-react` peer + `cva` + 内部 `button.tsx`）
3. 验证完整流程（含 `registryDependencies` 链式拉取）
4. 使用 `var(--radius-xl)` + semantic Tailwind class，是 `cssVars` fallback 的理想样本
5. Storybook story 已存在

**POC 5 天工作量：**
- Day 1: 手写 `bento-grid.json` manifest
- Day 2: 验证 `cssVars` fallback 在空白 Next.js 项目中的工作
- Day 3: 编写 `scripts/build-registry.ts` 基础版
- Day 4: 文档页加 "Copy component" 按钮
- Day 5: 补充 vitest render test

---

## 9. 迁移步骤总清单

### Phase 1 — 基础设施（Month 0-1，~8 天）
- [ ] `packages/design/ui/scripts/build-registry.ts` — 解析 primitives 输出 JSON
- [ ] 设计 registry JSON schema，扩展 shadcn 标准 + `meta.nebutraTokens` / `meta.nebutraLayer`
- [ ] `apps/design-docs/public/r/` + `registry.json` index
- [ ] Turborepo pipeline 自动生成
- [ ] 部署到 `ui.nebutra.com`

### Phase 2 — POC 验证（Month 1-2，~5 天）
- [ ] `bento-grid` 端到端
- [ ] 验证 `cssVars` 写入
- [ ] 验证 `registryDependencies` 链
- [ ] Storybook 双源架构

### Phase 3 — 批量迁移（Month 2-4，~20 天）
- [ ] TIER B1 (~37) registry entries
- [ ] TIER B2 (~10)
- [ ] TIER B3 (~14)
- [ ] TIER B4 (~21)
- [ ] TIER B5 (~9)
- [ ] TIER B6 (~6)
- [ ] B7 patterns (~3)
- [ ] 测试文件 + `@deprecated` JSDoc

### Phase 4 — npm 包瘦身（Month 4-6，~10 天）
- [ ] 移除 TIER B 专用依赖（`cobe`, `dotted-map`, `react-tweet`, `@paper-design/shaders-react`, `three`, `@react-three/fiber`, `canvas-confetti`, `react-syntax-highlighter`）
- [ ] 改为各 registry entry 的 `dependencies` 字段
- [ ] 评估 `recharts` 移出
- [ ] 更新 CLAUDE.md 层级表
- [ ] Storybook 主页加 "Available via Registry" 标签
- [ ] codemod 脚本（备用）

### Phase 5 — 稳定与监控（Month 6+）
- [ ] changelog 页自动 diff
- [ ] `version` 字段联动
- [ ] `npx shadcn diff` 文档
- [ ] 安全漏洞通知流程

---

## 10. 决策矩阵

| 维度 | npm 依赖 (TIER A) | registry copy-paste (TIER B) |
|------|-------------------|------------------------------|
| 升级方式 | `pnpm update @nebutra/ui` | `shadcn diff` + 手动 apply |
| 安全补丁 | 自动传播 | changelog 通知 + 手动 |
| 定制化 | className + CSS 变量 | 直接改 TSX |
| Bundle | tree-shaking | 零 unused deps |
| 复杂依赖 | 强制拉入 | 按需安装 |
| 适用类型 | Radix 包装, providers | 营销/装饰/业务 |
| 学习成本 | 低 | 中 |
| 版本一致性 | 强 | 弱（各 app 可能不同版本） |
| 可移植性 | 依赖 @nebutra/ui | 独立 |

---

**文件路径参考：**
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/package.json` — 30+ deps
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/primitives/index.ts` — 140+ 组件
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/components/index.ts`
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/layouts/index.ts`
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/layout/index.ts`
- `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/CLAUDE.md` — Component Generation Rules（Phase 4 更新）
