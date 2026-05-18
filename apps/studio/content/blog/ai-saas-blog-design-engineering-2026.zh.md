---
title: 2026 硅谷 AI SaaS 博客设计与工程实录：从 Geist 到霞鹜文楷
slug: ai-saas-blog-design-engineering-2026
translationKey: ai-saas-blog-design-engineering-2026
excerpt: 一份关于 2026 年硅谷头部 AI SaaS、设计系统团队博客与 Docs 视觉和工程范式的深度盘点，以及如何在中文语境下复刻这套审美。
author: Tseka Luk
categories: Design System, Next.js, Typography, AI SaaS
publishedAt: 2026-05-18T14:27:43.000Z
---

# 2026 硅谷 AI SaaS 博客设计与工程实录：从 Geist 到霞鹜文楷

## 写在前面

最近半年我一直在看硅谷头部 AI SaaS 公司的博客、Changelog 和 Docs 站，试图回答一个问题：它们看起来为什么都那么像，但又比一般 SaaS 高一个档次？

把 Anthropic、Vercel、Linear、Resend、Cursor、Stripe、shadcn 这些站点放在一起对比之后，我发现 2026 年的硅谷 AI SaaS 博客已经收敛到了一套高度一致的“瑞士派 × 工程师审美”范式：OKLCH 语义化 token、Tailwind v4 `@theme` 块、shadcn/Radix 组件契约、Next.js App Router、MDX / Velite / Fumadocs 的内容层、Shiki 双主题代码块、`@vercel/og` 的动态 OG、View Transitions API 的软切换。

视觉上，它们抛弃了纯黑 `#000` 与拟物渐变，转向“温暖的近黑”和“单色 + 单一克制 accent”。字体则成为身份本身：Vercel 有 Geist，OpenAI 有 OpenAI Sans，Anthropic 有 Anthropic Sans / Serif / Mono，Linear 用 Inter Display。

这篇文章把视觉、工程、设计系统、中文本地化串成一张图。目标是让一个有经验的前端工程师或设计师读完之后，清楚地知道：这些公司是怎么做的、为什么这样做、以及怎么在中文语境下复现这套审美。

## 一、视觉趋势：从 Linear 紫蓝渐变到 Anthropic 温暖近黑

### 1.1 OKLCH 成为新基线

2025 年 1 月 22 日 Tailwind v4 发布时，官方博客里写得很直白：

> We've upgraded the entire default color palette from rgb to oklch, taking advantage of the wider gamut to make the colors more vivid in places where we were previously limited by the sRGB color space.

出处：[Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4)。

[shadcn/ui 也跟进了](https://ui.shadcn.com/docs/tailwind-v4)：2025 年 3 月起新工程默认 `new-york` style，所有色值从 HSL 全量迁到 OKLCH，而且是非破坏性变更。这之后 Radix Themes、Vercel Geist、Linear 的拾色器全部接入 OKLCH。

OKLCH 的工程价值有三个：

- 感知均匀：同一 L 值横跨整个色环看起来亮度一致，等步长生成色阶不再忽明忽暗。
- 暗色模式可数学化：Steve Kinney 在 [Tailwind v4 OKLCH 教程](https://stevekinney.com/courses/tailwind/oklch-colors)里把这条原则写得最清楚：Use L values for contrast. Bigger L differences = better contrast。暗色版只需要把 surface 和 text 的 L 值对调，色相和 chroma 完全复用。
- wide-gamut：在 P3 显示器上能表达 sRGB 出不来的霓虹色，P3 fallback 由 `@supports (color: oklch(...))` 自动降级。

### 1.2 带色相的近黑是 2026 年最明显的转向

Anthropic 的站点上已经看不到 `#000`。第三方设计拆解平台 [Refero 把 Anthropic 的色板剖了一遍](https://styles.refero.design/style/d469cba4-c448-4a43-a033-883f8bfcdc42)：

> Anthropic's site runs on warm ivory parchment — not white, not gray, but the color of aged paper under good light.

Anthropic 公开的 [Brand Guidelines skill](https://www.skillsdirectory.com/skills/prat011-brand-guidelines) 把主色定为 `#141413` 深色、`#faf9f5` ivory、`#d97757` Clay 主 accent、`#788c5d` Olive、`#6a9bcc` Blue。

Linear 在 [2024 年 11 月的官方设计博客 How we redesigned the Linear UI part II](https://linear.app/blog/how-we-redesigned-the-linear-ui-part-ii) 中亲自承认了从“线性紫蓝渐变”向“中性近黑”的转向：

> We continued polishing the new color theme … by limiting how much chrome (blue in our case) was used in the calculations applied to our color system.

LogRocket 2025 年的 [Linear Design 年终回顾](https://blog.logrocket.com/ux-design/linear-design/) 直接说 Linear 自己在 2025 年也大幅削减了 glass / 复杂 gradient，从 monochrome blue 变成 monochrome black / white。

### 1.3 语义化 token 已经统一为 shadcn 契约

无论是 Anthropic、Vercel、Linear 还是后来的众多模仿者，语义 token 几乎都收敛到了 [shadcn 这一组](https://ui.shadcn.com/docs/theming)：

```css
--background  --foreground
--card        --card-foreground
--popover     --popover-foreground
--primary     --primary-foreground
--secondary   --secondary-foreground
--muted       --muted-foreground
--accent      --accent-foreground
--destructive --destructive-foreground
--border  --input  --ring
--chart-1..5
--sidebar-*
```

每个 color 都有 `-foreground` 配对色，所有组件都引用 var，切换 `:root` 与 `.dark` 就完成主题切换。[Radix Colors 的 12 步色阶哲学](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)被几乎所有衍生方案直接照搬：1-2 是 backgrounds，3-5 是 component states，6-8 是 borders，9-10 是 solid backgrounds，11-12 是 text。

### 1.4 字体：自有字族就是品牌

这条最值得讲。2025 到 2026 年，硅谷头部 AI SaaS 几乎都在做自家字族。

**Vercel Geist** 在 2023 年 10 月发布，由 Vercel 与阿根廷 [Basement Studio 合作](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web)。Google Fonts 公开 credit 的设计师包括 Andrés Briganti、Mateo Zaragoza、Guillermo Rauch、Evil Rabbit、José Rago、Facundo Santana。[官方 README](https://github.com/vercel/geist-font/blob/main/readme.md) 写得很坦诚：

> Geist has been influenced and inspired by the following typefaces: Inter, Univers, SF Mono, SF Pro, Suisse International, ABC Diatype Mono, and ABC Diatype.

Vercel 自己定位为：Geist embodies our design principles of simplicity, minimalism, and speed, drawing inspiration from the renowned Swiss design movement。它使用 SIL OFL 1.1 开源，[npm 上的 `geist` 包](https://www.npmjs.com/package/geist) 可以一键集成，`import { GeistSans, GeistMono } from 'geist/font'` 即可，零 CLS、零外部请求。

**OpenAI Sans** 是 OpenAI 公司史上第一次品牌重塑的一部分，2025 年 2 月发布，由柏林的 [ABC Dinamo 与 OpenAI 内部团队合作](https://www.wallpaper.com/tech/openai-has-undergone-its-first-ever-rebrand-giving-fresh-life-to-chatgpt-interactions)。[CXO Digitalpulse 的拆解](https://www.cxodigitalpulse.com/openai-unveils-major-rebrand-with-a-new-logo-typeface-and-colour-palette/) 描述为 blends geometric precision and functionality with a rounded, approachable character。这套字体合并了 OpenAI 此前在不同产品上用的六七种字体，并通过共享的 emotive point 与 ChatGPT 的脉动光标形成统一符号。

**Anthropic 字体三件套**在站点上的分工被 [Refero 拆得很清楚](https://styles.refero.design/style/d469cba4-c448-4a43-a033-883f8bfcdc42)：Anthropic Serif 用于暗色大标题，Anthropic Sans 用于浅色界面标题，Anthropic Mono 用于日期、类别等结构化 metadata。最有趣的细节是标题强调机制不是颜色，而是 double-underline：用粗厚双下划线替代色彩强调。

**Linear** 在重设计中明确写到：We started using Inter Display to add more expression to our headings while maintaining their readability and kept using regular Inter for the rest。Inter 是 Figma 主设计师 Rasmus Andersson 的作品，且免费。这种“工程师审美 + 不上奢侈版权”的取舍，是 Linear、Tailwind、Resend 一致的选择。

**Resend** 在 [Rebranding Resend](https://resend.com/blog/rebranding-resend) 里公开：Domaine is our new serif font for editorial headlines；Favorit 用于 subheadings，Inter 继续作为正文主字体。Resend 还直接说自己是 dark mode first。

把这一圈看下来，2026 年最稳的 SaaS 博客字体搭配是：Domaine Display / Tiempos 做编辑标题，Inter 做正文，Geist Mono / JetBrains Mono / Sohne Mono 做代码。

### 1.5 排版节奏

主流博客的 `max-width` 收敛到 content column 640-720px + bleed full-width media。行高西文 1.5-1.65，CJK 推荐 1.7-1.8。[Typotheque 的 CJK 排版文章](https://www.typotheque.com/articles/typesetting-cjk-text) 给出的具体值是：

> For CJK text, which tends to have a higher density of information per character, a leading value of around 1.7 improves both readability and aesthetic balance.

响应式字号基本都靠 `clamp()` + modular scale，这点没什么悬念。

### 1.6 装饰：Brutalism 与 Swiss 的余波

这套审美不是没有装饰，而是装饰退到了系统层：

- Grain noise 与 subtle radial gradient 仍在 Resend、Vercel changelog hero、Linear marketing 上活跃，但都被严格压在背景层。
- Brutalism 与 Swiss 风格继续影响 Anthropic：0px border-radius 按钮、无 shadow 卡片、纯靠 surface 色阶分层、Mono 标签代替花哨 chip。
- Glassmorphism 大面积退潮。
- dotted background / subtle border 在 Vercel Geist 与 shadcn/ui 文档里大量使用，成为最低成本的工程师审美装饰。

### 1.7 微交互：View Transitions API 成为默认

2025 年 React 团队在 React Conf 2025 上把 `<ViewTransition>` 从 experimental 移到 canary。Chrome DevRel 的 [What's new in view transitions (2025 update)](https://developer.chrome.com/blog/view-transitions-in-2025) 原话是：

> They announced react@experimental support back in April and this week, at React Conf, they moved support of it into react@canary which means the design is close to final.

[Firefox 144](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/144) 带来 same-document view transitions Baseline，[web.dev 已经把它列为 Baseline Newly available](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available)。Next.js 也在 [`next.config.js` 中提供了 `experimental.viewTransition`](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) 标志，并在 [View transitions guide](https://nextjs.org/docs/app/guides/view-transitions) 里介绍了基于 App Router 的用法。

主流用法有四种：列表到详情的共享元素 morph、Suspense reveal 的 skeleton 软切换、路由方向区分、scroll-driven animation 做阅读进度条与 hero parallax。

务必加 `prefers-reduced-motion` 兜底：

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms;
    transition-duration: 0.01ms;
  }
}
```

### 1.8 代码块：Shiki 双主题成为事实标准

Vercel 的 Next.js docs、Astro、Anthony Fu 的 antfu.me、Fumadocs 默认全部用 [Shiki](https://shiki.style/)。

三个关键能力：

- 双主题：`codeToHtml(code, { themes: { light: 'github-light', dark: 'github-dark' } })` 一次生成两套 inline 样式，通过 CSS 变量在 `:root` / `.dark` 切换，零客户端 JS。实践可以参考 [Afnizar](https://afnizarnur.com/writing/shiki-for-syntax-highlighting-in-next-js) 与 [Nikolai](https://www.nikolailehbr.ink/blog/syntax-highlighting-shiki-next-js)。
- RSC 友好：Shiki 用 TextMate grammars，同 VS Code，通过 `@shikijs/twoslash` 与 `hast-util-to-jsx-runtime` 可以和 React Server Components 适配。
- Twoslash hover：[shikijs/twoslash](https://github.com/shikijs/twoslash) 在 Shiki v1.0 之后作为 transformer 集成，Fumadocs 提供 `fumadocs-twoslash` 一键启用，可以在静态 HTML 中得到 TypeScript 真实类型 hover。

代码块 chrome 上普遍包含文件名、行号、高亮行、diff、复制按钮、language badge。差异化点是 Anthropic 的代码块沿用 ivory 卡片美学，Vercel / Linear 用 Geist Mono / Inter Mono，Resend 用 dark-mode-first 卡片 + 蓝色 accent。

## 二、工程实现：不要再选 Contentlayer

### 2.1 内容层选型

Contentlayer 实际已停滞。[Dub.co 团队在 Migrating from Contentlayer to Content Collections 一文](https://dub.co/blog/content-collections) 给出最直接的诊断：

> ever since their main sponsor, Stackbit, was acquired by Netlify, Contentlayer has been effectively unmaintained.

原作者 schickling 也在 [GitHub Issue #429](https://github.com/contentlayerdev/contentlayer/issues/429) 亲自确认：他们的赞助缩减后，自己目前只能每月分配一天给项目。

2026 年的选型矩阵可以这样看：

- [Fumadocs](https://v14.fumadocs.dev/)：React 文档框架，适合嵌入到 Next.js 产品里的产品文档。
- Nextra v4：Next.js 文档主题，适合标准文档站，不想 compose 的团队。
- [Velite](https://velite.js.org/guide/introduction)：type-safe 内容数据层，适合博客和列表型站点。
- Content Collections：Contentlayer 直接替代，适合已经熟悉 Contentlayer 的迁移者。
- next-mdx-remote / `@next/mdx`：直接 MDX 编译，适合极简静态博客。
- Sanity + [PortableText](https://www.sanity.io/docs/developer-guides/beginners-guide-to-portable-text)：Headless CMS + 非线性富文本，适合多端复用和非技术作者参与。
- Markdown in git：适合独立博客和工程团队。

[PkgPulse 的 2026 横评](https://www.pkgpulse.com/guides/fumadocs-vs-nextra-v4-vs-starlight-documentation-sites-2026) 把 Fumadocs、Nextra v4、Starlight 做了详细对比。结论大致是：Fumadocs 在 headless 和可替换 UI 上胜出，Nextra v4 在开箱即用上胜出。

我的推荐组合：

- 产品博客：Sanity + PortableText。
- 文档站：Fumadocs MDX + Velite or Content Collections。
- 个人博客：Markdown in git + Velite + `next/mdx`。

### 2.2 Design token 落地

[Tailwind v4](https://fireup.pro/news/tailwind-css-v4-0) 把 token 从 `tailwind.config.js` 全部迁移到 CSS 的 `@theme` 块。[shadcn 文档官方写法](https://ui.shadcn.com/docs/theming) 很清楚：

```css
@import "tailwindcss";
@custom-variant dark (&:is(.dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
}
```

`@theme inline` 是关键。它把 CSS 变量内联到 Tailwind 的设计 token，utilities 在编译时仍引用 `var(--primary)`，因此 runtime 改 `:root` 即可整站换肤。Style Dictionary 与 Radix Colors 主要作为色阶生成器使用，[`@radix-ui/colors`](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) 仍是行业最稳的 12 步色阶来源。

### 2.3 组件抽象

[shadcn 模式](https://ui.shadcn.com/docs/components-json) 已经成为 React 生态默认：`npx shadcn@latest add button` 把组件源码复制到 `components/ui/`，使用方拥有源码、自己改、CVA 处理 variant。

[GitHub Discussion #9754](https://github.com/shadcn-ui/ui/discussions/9754) 里官方推荐的做法是直接在 `components/ui` 下改，而不是再包一层 wrapper。加 wrapper 会破坏 token 契约。

MDX 自定义组件的 idiomatic 写法是在 `mdx-components.tsx` 里集中映射：

```tsx
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h2: (props) => <h2 className="scroll-mt-20 mt-12 text-2xl" {...props} />,
    pre: (props) => <CodeBlock {...props} />,
    Callout,
    Tabs,
    Steps,
    Image,
    Video,
    Tweet,
    ...components,
  };
}
```

PortableText 的关键差异是它是 JSON，数据库友好、多端复用，但需要写 `components` 序列化。Sanity 官方推荐 `@portabletext/react`。代码块的 idiomatic 处理是用 `createHighlighter` 单例，当 `block._type === "code"` 时调用 `codeToHtml` 产出 HTML 字符串，React 再用 `dangerouslySetInnerHTML`。

### 2.4 OG 图、字体加载与其它

OG 图：Vercel 在 2022 年 10 月发布了 [`@vercel/og`](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images)，底层是 Satori。官方公开的性能数据很惊人：

> Vercel OG (500KB) is 100x more lightweight than Chromium + Puppeteer (50MB), which allows functions to start almost instantly.

App Router 中直接 `import { ImageResponse } from "next/og"` 即可，[官方文档](https://vercel.com/docs/og-image-generation) 提醒 Satori 只支持 flexbox，不支持 grid，字体只支持 ttf / otf / woff，bundle 不超过 500KB。

字体加载：`next/font/google` / `next/font/local` 在构建时下载、自托管、子集化，自动加 `font-display: swap`，减少 CLS。Vercel 自家的 [Custom fonts without compromise using Next.js and `next/font`](https://vercel.com/blog/nextjs-next-font) 把这个流程总结为 CLS、FOUC、客户端 JS 复杂度同时下降。CJK 字体需要单独的分包 CDN。

暗色模式：`next-themes` + `class="dark"` 切换 + `suppressHydrationWarning` 防 FOUC。

搜索与评论：小站用 [Pagefind](https://pagefind.app/)；中型文档站用 Algolia DocSearch；Fumadocs 内置 search。评论默认 Giscus。

## 三、设计系统拆解：Geist / Radix / shadcn / Linear

### 3.1 Geist

哲学：Swiss 风格 + 工程师审美 + black / white precision。

可借鉴的具体规范：

- 以字体为品牌锚点，而不是 logo。
- 零色彩 hero，首页几乎只有黑白、Geist 字与一个 accent。
- 代码块即 hero，产品页直接展示 terminal-style code。
- `next/font` 自托管：`pnpm add geist` 后 `import { GeistSans, GeistMono } from "geist/font"`，零网络请求。

### 3.2 Radix Colors

哲学：12 步色阶，每一步都有明确职责。1-2 是 backgrounds，3 是 normal，4 是 hover，5 是 pressed，6 是 subtle non-interactive borders，7 是 subtle interactive borders，8 是 stronger borders and focus rings，9 是 highest-chroma solid，10 是 hover for solid，11 是 low-contrast text，12 是 high-contrast text。Step 11 与 12 在自家 step 2 背景上分别保证 APCA Lc 60 / Lc 90，见 [DeepWiki 拆解](https://deepwiki.com/radix-ui/website/5.3-color-system)。

可借鉴的具体规范：

- 每个语义状态用确定步，不要凭感觉调透明度。
- 暗色等价对换：Radix 提供 `blue` + `blueDark`，变量名相同，只在 `.dark` 下重定义。
- Alpha 变体用于在彩色背景上叠加，不要直接用 rgba。
- APCA 比 WCAG 更接近人眼感知。

### 3.3 shadcn/ui

哲学：You own the code。它不是 npm 库，而是 CLI 复制源码进项目。

可借鉴的具体规范：

- token 契约就是前面那组语义变量 + `--chart-1..5` + `--sidebar-*`。
- 每个语义 color 都有 `-foreground` 配对色。
- `--radius` 作根 token，sm / md / lg / xl / 2xl 用 `calc()` 派生。
- registries mechanism 支持私有 / 团队组件分发，这是 2026 年企业团队搭设计系统的事实标准。

### 3.4 Linear Method

[Linear Method](https://linear.app/method) 的哲学是 Opinionated software。一个用例只有一条好的路径。Linear Method 主页原话：

> There is a lost art of building true quality software. To bring back the right focus, here are the foundational ideas Linear is built on.

可借鉴的具体规范：

- 写任务，不写 user stories。
- 短周期 cycles，1-2 周固定 cadence。
- 不要 reinvent terms，Projects 就叫 Projects，不要发明 workspace 语义。
- 设计与工程并行，平等推拉。
- 小 PR / 小 diff。
- 写 changelog：对内追踪进度，对外做沟通。这就是为什么 Linear / Vercel / Resend 的 changelog 本身都是博客质量的产品。

## 四、中文社区本地化：CJK 三件套

复刻硅谷的视觉容易，工程要补的是 CJK 这一层。

### 4.1 盘古之白

[vinta/pangu.js](https://github.com/vinta/pangu.js) 是 CJK 与拉丁字符之间自动加空格的事实标准：

```html
<script src="pangu/dist/browser/pangu.umd.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", () => {
    pangu.autoSpacingPage();
  });
</script>
```

注意：官方明确不建议在 Markdown 上跑 pangu，因为会破坏链接、代码块。应该在 HTML 渲染后处理，或针对 plain text 节点处理。

### 4.2 CSS 四件套

CJK 段落排版必须叠这一层：

```css
html[lang="zh"] {
  word-break: keep-all;
  line-break: strict;
  overflow-wrap: break-word;
  text-wrap: balance;
  line-height: 1.75;
}
```

### 4.3 字体与分包 CDN

中文字体的工程挑战是思源黑体完整 CJK woff2 往往超过 4MB，直接加载会拖慢 LCP。解决方案是按 Unicode range 分包 CDN。

- [思源黑体 Source Han Sans / Noto Sans CJK](https://github.com/adobe-fonts/source-han-sans) 是开源默认。
- [霞鹜文楷 LXGW WenKai](https://github.com/lxgw/LxgwWenkai) 由 lxgw 基于 Fontworks Klee One 衍生，SIL OFL 1.1，过去两年成为中文独立博客最流行的“楷体正文”。[CMBill/lxgw-wenkai-web](https://github.com/CMBill/lxgw-wenkai-web) 提供现成的 npm 包与 CDN。
- 霞鹜文楷屏幕阅读版字重对比度更适合屏幕长阅读，xLog 等内容平台广泛采用。
- ZeoSeven Fonts 与中文网字计划提供按 Unicode range 分包 CDN，浏览器只下载页面实际用到的字形子集。

### 4.4 中文独立博主案例

- guangzhengli：自有 Hugo 主题 hugo-theme-ladder + [nextjs-blog-template](https://github.com/guangzhengli/nextjs-blog-template)，内置 Giscus、RSS、小红书链接，中英双语。
- 阮一峰：古早 Movable Type，极简表格布局，系统字体，纯 HTML，2000+ 文章。
- 张鑫旭：WordPress，文字密度极高，大量 CSS 演示嵌入。
- Yihui Xie：[hugo-xmin](https://github.com/yihui/hugo-xmin)，约 140 行 HTML + CSS，零依赖。
- Anthony Fu：[antfu.me](https://antfu.me/)，Nuxt + Vite + UnoCSS，个人作品集和博客一体。

guangzhengli 的 `nextjs-blog-template` 实际上把“硅谷工程师审美 + 中文博客最佳实践”压缩成了一个开源模板：内容文件在 `src/content/blog`，配置集中在 `src/lib/config.ts`，Giscus、RSS / Atom / JSON Feed、小红书 / 微信 / Buy Me a Coffee 链接、可选 edge / fluid compute 都有。这是中文社区目前最完整的硅谷范式复刻模板。

### 4.5 中文社区的批评与本土化

正向模仿层：即刻、V2EX、掘金上的高赞文章把 shadcn/ui、Tailwind v4、Vercel Geist、Linear 设计哲学当作显学来拆解。少数派的设计向文章长期推 Linear、Raycast、Arc、Cursor。

批评层：[LogRocket 2025 年 Linear design 回顾](https://blog.logrocket.com/ux-design/linear-design/) 指出 linear design 已经让几乎每个 SaaS 网站长一样。中文社区对此的回应是把工程师审美与汉字编辑性结合：霞鹜文楷正文 + Geist Mono 代码 + Anthropic 风 ivory 卡片混搭。少数派、阮一峰周刊属于中文编辑传统派，坚持高密度链接列表与古早 HTML。

本土化关键障碍：

- 盘古之白要不要在内容入库时做：多数中文博客选择在渲染时做，避免污染原文。
- CJK 字体加载延迟导致 FOUC 比拉丁字严重，必须用 `font-display: swap` + 同度量 fallback。
- 中英混排的字号 vs. 行高：CJK 推荐 1.7-1.75，拉丁推荐 1.5-1.6，只能取中间值或在 `:lang(zh) p` 上覆盖。
- 代码块里的 CJK 注释容易被等宽字体打乱，Sarasa Mono / 更纱黑体 / JetBrains Mono + 思源黑等宽合并字体是常见选择。

## 五、可落地清单：用 Next.js + Sanity 自建博客

### Token 层

- 用 Tailwind CSS v4.0+，`@import "tailwindcss"`，`@custom-variant dark (&:is(.dark *))`。
- 全部颜色用 OKLCH，而非 hex / HSL。
- 语义 token 全开，每个 color 都有 `-foreground` 配对。
- `:root` 与 `.dark` 各一套，`@theme inline` 把 var 暴露为 utility。
- `--radius` 作根 token，其他 size 用 `calc()` 派生。
- 引入 `@radix-ui/colors` 作为色阶来源。

### 字体层

- 主字体用 `next/font/local` 自托管 Geist 或 Inter，subset 只选 `latin`。
- CJK 字体用 ZeoSeven 或 lxgw-wenkai-web 分包 CDN。
- `font-display: swap` 必加；CJK 配 metric-compatible fallback。
- 代码块用 Geist Mono / JetBrains Mono / Sarasa Mono。

### 组件层

- `npx shadcn@latest init`，选 `new-york` style + `neutral` baseColor + cssVariables: true。
- 用 CVA 定义 variant。
- `cn()` = `clsx + tailwind-merge`。

### 内容工程层

- 产品 / 多端复用：Sanity + Studio v3 + `@portabletext/react` + Shiki `createHighlighter` 单例。
- 工程师 / 独立博客：Markdown in git + Velite or Content Collections。
- 文档站：Fumadocs + `fumadocs-twoslash`。
- MDX 自定义组件集中在 `mdx-components.tsx`。
- 不要再选 Contentlayer。

### 代码块

- Shiki，不要 Prism / highlight.js。
- 双主题 `{ light: "github-light", dark: "github-dark" }`。
- 文件名 chrome、行号、高亮行、diff、复制按钮全部用 transformer 完成。
- 可选 `@shikijs/twoslash` 加 TypeScript hover。

### 性能 / SEO

- `@vercel/og` 生成动态 OG，1200×630。
- App Router + RSC + ISR，`generateStaticParams` 预渲染。
- sitemap.ts / robots.ts / rss.xml / JSON-LD `Article` schema。
- `next-themes` + `<html suppressHydrationWarning>` 防 FOUC。

### View Transitions

- 使用 `experimental.viewTransition` 或局部 `document.startViewTransition`。
- 列表到详情做共享元素 morph，Suspense reveal 做软切换。
- 必须加 `prefers-reduced-motion` 兜底。

### CJK 三件套

- 引入 `pangu.js`，client 端 `pangu.autoSpacingPage()`，不要处理 Markdown 原文。
- 全局 CSS：`word-break: keep-all` + `line-break: strict` + `overflow-wrap: break-word` + `text-wrap: balance` + `line-height: 1.75`。

### 搜索 / 评论 / 部署

- Pagefind 静态搜索或 Algolia DocSearch。
- Giscus 评论。
- Vercel 部署，Image Optimization 与 Edge OG 开箱即用。
- CI 卡 LCP / CLS / INP 阈值：LCP < 2.0s，CLS < 0.05，INP < 200ms。

## 六、十条决策建议

1. 如果今天开博客，直接 fork [guangzhengli/nextjs-blog-template](https://github.com/guangzhengli/nextjs-blog-template)，改 token，30 分钟上线。这是中文社区对硅谷范式最完整的开源复刻。
2. 不要再选 Contentlayer。它已经实际停滞，App Router 兼容性长期落后；迁移到 Velite、Content Collections 或 Fumadocs MDX。
3. 代码块只用 Shiki + 双主题。Prism / highlight.js 都会向客户端发 JS；若要 TypeScript hover，加 `fumadocs-twoslash`。
4. 暗色不要再用 `#000`。抄 Anthropic 的 `#141413 / #faf9f5 / #d97757` 或 Linear 的 neutral with reduced chrome；纯黑在 OLED 之外会显得廉价。
5. OG 图必须动态。`@vercel/og` 配合 Satori 亚秒内出图，免去手工设计。
6. 字体决定身份。如果不想做自有字族，Inter + Geist Mono + 一个 serif display 是最稳搭配；中文优先霞鹜文楷或思源黑体 + 分包 CDN。
7. View Transitions 不是噱头。几十行代码就能把博客感拉到 native app 感，但务必加 reduced-motion 兜底。
8. 不要给 shadcn 加奇怪的 wrapper。它的设计哲学就是你拥有源码，所有定制改 `components/ui/*.tsx` 里的 CVA 即可。
9. CJK 排版必须叠一层处理。盘古之白 + 四件套 CSS，缺一个都会在长 URL / 中英混排上崩。
10. 基准阈值：LCP < 2.0s，CLS < 0.05，INP < 200ms；LCP > 3s 或 CLS > 0.1 时，先排查 CJK 字体阻塞与 hero 图未加 `priority`。

## 七、注意事项

- Anthropic 的公开 fallback 字体 Poppins / Lora 与站点上实际跑的 Anthropic Sans / Serif / Mono 不是同一组。前者是给非 Anthropic 资产用的近似 fallback，后者是公司内部字体，未公开授权。
- Geist Sans 与 Inter 字形差异较小。如果你已经在用 Inter，工程角度切换收益有限；Geist 的主要价值在配套的 Geist Mono 与 npm 一键集成。
- Tailwind v4 的 OKLCH 默认色板并非完美单调线性。[The Mystery of Tailwind Colors (v4)](https://dev.to/matfrana/the-mystery-of-tailwind-colors-v4-hjh) 指出 lightness / chroma / hue 都不是线性插值，而是人工挑选。
- PortableText 与 MDX 的选择不可逆。已经在 Sanity 写满几十篇的项目迁移到 MDX 需要 `@portabletext/markdown` 与自定义 serializer，工程量很大。
- View Transitions 的浏览器支持还需要降级。Chrome / Edge 完整支持，Firefox 144 起进入 Baseline，Safari 部分支持。
- [Anthropic Claude Design](https://www.datacamp.com/blog/claude-design) 虽然能从 codebase / Figma 自动提取设计系统并生成新原型，但仍是 research preview，不应替代人工 token / 组件设计。
- `pangu.js` 不要处理 Markdown 原文，应在 HTML 渲染后或针对 plain text 节点处理。
- Resend 用的 Domaine Display 是 [Klim Type Foundry](https://klim.co.nz/) 的商业字体，小项目复刻请改用 IBM Plex Serif / Newsreader 等开源替代；OpenAI Sans 是 ABC Dinamo 为 OpenAI 定制，未对外授权。

## 主要参考链接

- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [Radix Colors scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Linear Method](https://linear.app/method)
- [Vercel Geist](https://vercel.com/font)
- [Basement: The Birth of Geist](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web)
- [Anthropic design system on Refero](https://styles.refero.design/style/d469cba4-c448-4a43-a033-883f8bfcdc42)
- [OpenAI rebrand on Wallpaper](https://www.wallpaper.com/tech/openai-has-undergone-its-first-ever-rebrand-giving-fresh-life-to-chatgpt-interactions)
- [Resend rebrand](https://resend.com/blog/rebranding-resend)
- [Dub.co Content Collections migration](https://dub.co/blog/content-collections)
- [Contentlayer issue 429](https://github.com/contentlayerdev/contentlayer/issues/429)
- [Fumadocs](https://v14.fumadocs.dev/)
- [Velite](https://velite.js.org/guide/introduction)
- [Sanity Portable Text](https://www.sanity.io/docs/developer-guides/beginners-guide-to-portable-text)
- [Shiki](https://shiki.style/)
- [Vercel OG](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images)
- [Chrome View Transitions 2025](https://developer.chrome.com/blog/view-transitions-in-2025)
- [Typotheque CJK typesetting](https://www.typotheque.com/articles/typesetting-cjk-text)
- [guangzhengli/nextjs-blog-template](https://github.com/guangzhengli/nextjs-blog-template)
- [LXGW WenKai](https://github.com/lxgw/LxgwWenkai)
- [Anthony Fu](https://antfu.me/)

如果这篇文章对你有帮助，欢迎在评论里聊聊你自己的博客是怎么搭的、最后选了哪一套栈。
