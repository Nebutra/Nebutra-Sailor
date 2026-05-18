---
title: "Inside 2026 AI SaaS Blog Design: From Geist to LXGW WenKai"
slug: ai-saas-blog-design-engineering-2026
translationKey: ai-saas-blog-design-engineering-2026
excerpt: A field report on the visual language and engineering stack behind 2026 AI SaaS blogs, docs, and changelogs, plus the CJK layer needed to make the pattern work in Chinese.
author: Tseka Luk
categories: Design System, Next.js, Typography, AI SaaS
publishedAt: 2026-05-18T14:27:43.000Z
---

# Inside 2026 AI SaaS Blog Design: From Geist to LXGW WenKai

## Before We Start

Over the past six months I have been studying the blogs, changelogs, and documentation sites of leading AI SaaS companies. The question I kept coming back to was simple: why do they look so similar, yet still feel one level above ordinary SaaS sites?

When Anthropic, Vercel, Linear, Resend, Cursor, Stripe, and shadcn are compared side by side, the 2026 pattern becomes clear. Silicon Valley AI SaaS publishing has converged around a “Swiss modernism meets engineering taste” stack: semantic OKLCH tokens, Tailwind v4 `@theme`, shadcn/Radix component contracts, Next.js App Router, MDX / Velite / Fumadocs content layers, Shiki dual-theme code blocks, dynamic OG with `@vercel/og`, and soft route motion through the View Transitions API.

Visually, these sites have moved away from pure `#000` and obvious skeuomorphic gradients. They now favor warm near-black surfaces, restrained monochrome systems, and one carefully rationed accent color. Typography has become identity itself. Vercel has Geist. OpenAI has OpenAI Sans. Anthropic has Anthropic Sans / Serif / Mono. Linear uses Inter Display.

This essay connects the visual language, engineering decisions, design-system contracts, and Chinese localization layer into one practical map. The goal is that an experienced front-end engineer or designer can read it and understand how these companies build this feeling, why it works, and how to reproduce it in a Chinese-language context.

## 1. Visual Trend: From Linear Purple-Blue to Anthropic Warm Near-Black

### 1.1 OKLCH Becomes the Baseline

When Tailwind v4 shipped on January 22, 2025, the announcement said the quiet part out loud:

> We've upgraded the entire default color palette from rgb to oklch, taking advantage of the wider gamut to make the colors more vivid in places where we were previously limited by the sRGB color space.

Source: [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4).

[shadcn/ui followed](https://ui.shadcn.com/docs/tailwind-v4). Since March 2025, new projects default to the `new-york` style, and the color system moved from HSL to OKLCH as a non-breaking change. Radix Themes, Vercel Geist, and Linear's color tooling have all moved in the same direction.

OKLCH matters for three reasons:

- Perceptual uniformity: the same L value appears consistently bright across hues, so generated scales no longer feel randomly too dark or too bright.
- Mathematical dark mode: Steve Kinney's [Tailwind v4 OKLCH guide](https://stevekinney.com/courses/tailwind/oklch-colors) states the practical rule clearly: use L values for contrast. Bigger L differences mean better contrast. Dark mode can reuse hue and chroma while inverting surface and text lightness.
- Wide-gamut color: P3 displays can show colors that sRGB cannot, while `@supports (color: oklch(...))` gives a fallback path.

### 1.2 Warm Near-Black Is the 2026 Turn

Anthropic's website no longer feels like a `#000` site. [Refero's breakdown of Anthropic's palette](https://styles.refero.design/style/d469cba4-c448-4a43-a033-883f8bfcdc42) says it well:

> Anthropic's site runs on warm ivory parchment — not white, not gray, but the color of aged paper under good light.

Anthropic's public [Brand Guidelines skill](https://www.skillsdirectory.com/skills/prat011-brand-guidelines) lists `#141413` for deep surfaces, `#faf9f5` for ivory, `#d97757` for Clay, `#788c5d` for Olive, and `#6a9bcc` for Blue.

Linear made the same shift from the opposite direction. In [How we redesigned the Linear UI part II](https://linear.app/blog/how-we-redesigned-the-linear-ui-part-ii), the team wrote:

> We continued polishing the new color theme … by limiting how much chrome (blue in our case) was used in the calculations applied to our color system.

LogRocket's 2025 [Linear Design review](https://blog.logrocket.com/ux-design/linear-design/) makes the point even more directly: Linear itself reduced glass and complex gradients, moving away from monochrome blue toward monochrome black and white.

### 1.3 Semantic Tokens Have Converged on the shadcn Contract

Whether you look at Anthropic, Vercel, Linear, or their imitators, semantic tokens have mostly converged on the [shadcn theme contract](https://ui.shadcn.com/docs/theming):

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

Every color has a matching `-foreground`. Components consume variables rather than raw values. Switching `:root` and `.dark` becomes the theme system.

[Radix Colors' 12-step scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) is the shared mental model: steps 1-2 are backgrounds, 3-5 are component states, 6-8 are borders, 9-10 are solid fills, and 11-12 are text.

### 1.4 Typography: Custom Type Is the Brand

This is the most important design shift. In 2025 and 2026, leading AI SaaS companies treat typography as product identity.

**Vercel Geist** launched in October 2023, created with [Basement Studio](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web). Google Fonts credits Andrés Briganti, Mateo Zaragoza, Guillermo Rauch, Evil Rabbit, José Rago, and Facundo Santana. The [official README](https://github.com/vercel/geist-font/blob/main/readme.md) is explicit:

> Geist has been influenced and inspired by the following typefaces: Inter, Univers, SF Mono, SF Pro, Suisse International, ABC Diatype Mono, and ABC Diatype.

Vercel describes Geist as a typeface that embodies simplicity, minimalism, and speed, drawing from the Swiss design movement. It is SIL OFL 1.1, available as the [`geist` npm package](https://www.npmjs.com/package/geist), and can be self-hosted through `import { GeistSans, GeistMono } from "geist/font"` with no external font request and no layout shift.

**OpenAI Sans** was part of OpenAI's first major rebrand in February 2025, created with [ABC Dinamo](https://www.wallpaper.com/tech/openai-has-undergone-its-first-ever-rebrand-giving-fresh-life-to-chatgpt-interactions). [CXO Digitalpulse's write-up](https://www.cxodigitalpulse.com/openai-unveils-major-rebrand-with-a-new-logo-typeface-and-colour-palette/) describes it as blending geometric precision and functionality with a rounded, approachable character. The family unified several typefaces previously used across OpenAI's product surfaces and tied them to the shared “emotive point” motif that appears in ChatGPT's cursor and brand system.

**Anthropic's type trio** is explained clearly by [Refero](https://styles.refero.design/style/d469cba4-c448-4a43-a033-883f8bfcdc42). Anthropic Serif is used for dark editorial display moments. Anthropic Sans handles light-surface headings. Anthropic Mono marks metadata such as dates and categories. The most interesting detail is that emphasis is not mostly color-based. It is a thick double underline, replacing accent color as the primary decorative emphasis mechanism.

**Linear** wrote in its redesign notes that it started using Inter Display to add expression to headings while keeping regular Inter for the rest of the interface. Inter is free, open, and created by Figma designer Rasmus Andersson. That choice reflects the broader engineering taste shared by Linear, Tailwind, and Resend: premium feel without luxury-font dependency.

**Resend** wrote in [Rebranding Resend](https://resend.com/blog/rebranding-resend) that Domaine became the editorial headline typeface, Favorit stayed for subheadings, and Inter remained the primary body typeface. Resend also says directly that it is dark-mode first.

The stable 2026 SaaS blog pairing is therefore: Domaine Display or Tiempos for editorial headings, Inter for body text, and Geist Mono / JetBrains Mono / Sohne Mono for code.

### 1.5 Reading Rhythm

The dominant layout is a 640-720px content column with full-width or bleed media when needed. Western body text tends to sit around 1.5-1.65 line-height. CJK text needs more air, typically 1.7-1.8. [Typotheque's CJK typography article](https://www.typotheque.com/articles/typesetting-cjk-text) puts it this way:

> For CJK text, which tends to have a higher density of information per character, a leading value of around 1.7 improves both readability and aesthetic balance.

Responsive type is usually handled with `clamp()` and a modular scale.

### 1.6 Decoration: Brutalism and Swiss Residue

This design language is not decoration-free. The decoration has moved into the system layer.

- Grain noise and subtle radial gradients still appear in Resend, Vercel changelog pages, and Linear marketing pages, but they stay in the background.
- Brutalist and Swiss cues remain visible in Anthropic: flat buttons, little or no shadow, separation through surface steps, and mono metadata labels instead of decorative chips.
- Large-scale glassmorphism has receded.
- Dotted backgrounds and subtle borders are everywhere in Vercel Geist and shadcn docs because they are the cheapest way to signal engineering taste.

### 1.7 Microinteractions: View Transitions Become Normal

At React Conf 2025, React moved `<ViewTransition>` from experimental to canary. Chrome DevRel's [2025 update](https://developer.chrome.com/blog/view-transitions-in-2025) says:

> They announced react@experimental support back in April and this week, at React Conf, they moved support of it into react@canary which means the design is close to final.

[Firefox 144](https://developer.mozilla.org/en-US/docs/Mozilla/Firefox/Releases/144) brought same-document view transitions into Baseline status, and [web.dev](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available) now treats them as newly available. Next.js exposes [`experimental.viewTransition`](https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition) and documents App Router patterns in its [View transitions guide](https://nextjs.org/docs/app/guides/view-transitions).

The common use cases are list-to-detail shared element morphs, soft Suspense reveal, directional navigation animation, and scroll-driven reading progress.

Always honor reduced motion:

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms;
    transition-duration: 0.01ms;
  }
}
```

### 1.8 Code Blocks: Shiki Dual Themes Are the Default

Vercel's Next.js docs, Astro, Anthony Fu's antfu.me, and Fumadocs all default to [Shiki](https://shiki.style/).

Shiki matters for three reasons:

- Dual themes: `codeToHtml(code, { themes: { light: "github-light", dark: "github-dark" } })` generates both theme variables server-side. CSS switches between light and dark without client-side highlighting JavaScript. See the implementations from [Afnizar](https://afnizarnur.com/writing/shiki-for-syntax-highlighting-in-next-js) and [Nikolai](https://www.nikolailehbr.ink/blog/syntax-highlighting-shiki-next-js).
- RSC compatibility: Shiki uses the same TextMate grammar model as VS Code and works well with server rendering.
- Twoslash: [shikijs/twoslash](https://github.com/shikijs/twoslash) provides real TypeScript hover information in static output, and Fumadocs makes it easy to wire in.

The modern code block usually includes filename chrome, line numbers, highlighted lines, diff markers, copy button, and language badge. Anthropic keeps it in the ivory editorial system. Vercel and Linear use mono precision. Resend uses dark-first cards with a restrained blue accent.

## 2. Engineering: Do Not Start New Work on Contentlayer

### 2.1 Content Layer Choices

Contentlayer is effectively stalled. In [Migrating from Contentlayer to Content Collections](https://dub.co/blog/content-collections), the Dub.co team writes:

> ever since their main sponsor, Stackbit, was acquired by Netlify, Contentlayer has been effectively unmaintained.

The original author also acknowledged in [GitHub issue #429](https://github.com/contentlayerdev/contentlayer/issues/429) that reduced sponsorship left him with only limited time for the project.

The 2026 choice matrix looks like this:

- [Fumadocs](https://v14.fumadocs.dev/): a React documentation framework for product docs embedded in Next.js apps.
- Nextra v4: a batteries-included Next.js documentation theme.
- [Velite](https://velite.js.org/guide/introduction): a type-safe Zod-backed content layer for blogs and list-driven sites.
- Content Collections: a direct Contentlayer replacement for teams that liked the model.
- next-mdx-remote / `@next/mdx`: minimal MDX compilation.
- Sanity + [PortableText](https://www.sanity.io/docs/developer-guides/beginners-guide-to-portable-text): a headless CMS and structured rich-text model for multi-surface publishing and non-technical authors.
- Markdown in git: still excellent for engineering teams and solo publishers.

[PkgPulse's 2026 comparison](https://www.pkgpulse.com/guides/fumadocs-vs-nextra-v4-vs-starlight-documentation-sites-2026) compares Fumadocs, Nextra v4, and Starlight. The practical takeaway is that Fumadocs wins on headless composition, while Nextra wins on immediate defaults.

My default recommendation:

- Product blog: Sanity + PortableText.
- Docs: Fumadocs MDX + Velite or Content Collections.
- Personal blog: Markdown in git + Velite + `next/mdx`.

### 2.2 Design Tokens in Practice

[Tailwind v4](https://fireup.pro/news/tailwind-css-v4-0) moves token definition from `tailwind.config.js` into CSS `@theme`. The [shadcn theming docs](https://ui.shadcn.com/docs/theming) show the shape:

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

`@theme inline` is the key. Tailwind utilities still reference CSS variables, so runtime theme changes work by changing `:root`. Style Dictionary and Radix Colors are best treated as scale-generation tools, with [`@radix-ui/colors`](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) remaining the most stable 12-step scale source.

### 2.3 Component Abstraction

The [shadcn model](https://ui.shadcn.com/docs/components-json) is now the default React pattern: the CLI copies component source into `components/ui`, the team owns the code, and CVA handles variants.

In [GitHub Discussion #9754](https://github.com/shadcn-ui/ui/discussions/9754), the recommendation is to edit the copied source rather than wrapping every primitive in another abstraction layer. Wrappers often break the token contract.

For MDX, the idiomatic pattern is a central `mdx-components.tsx` mapping:

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

PortableText is different because it is JSON. It is database-friendly and multi-surface by default, but it requires serializers for blocks, marks, lists, and custom types. Sanity recommends `@portabletext/react`. For code blocks, the clean pattern is to use a highlighter singleton, detect `block._type === "code"`, call `codeToHtml`, and render the generated HTML.

### 2.4 OG, Fonts, Search, and Dark Mode

OG images: Vercel introduced [`@vercel/og`](https://vercel.com/blog/introducing-vercel-og-image-generation-fast-dynamic-social-card-images) in 2022. It is powered by Satori. Vercel's benchmark claims:

> Vercel OG (500KB) is 100x more lightweight than Chromium + Puppeteer (50MB), which allows functions to start almost instantly.

In App Router, `import { ImageResponse } from "next/og"` is enough. [Vercel's OG docs](https://vercel.com/docs/og-image-generation) note the important limitation: Satori supports flexbox, not grid, and the bundle must stay within limits.

Fonts: `next/font/google` and `next/font/local` self-host fonts, subset them, apply `font-display: swap`, and reduce CLS. Vercel's [next/font article](https://vercel.com/blog/nextjs-next-font) explains the performance rationale. CJK fonts need a separate strategy because full Chinese fonts are much heavier.

Dark mode: `next-themes`, `class="dark"`, and `<html suppressHydrationWarning>` remain the simple default.

Search and comments: use [Pagefind](https://pagefind.app/) for static search, Algolia DocSearch for larger docs, Fumadocs' built-in search when already using Fumadocs, and Giscus for GitHub Discussions-backed comments.

## 3. Design System Lessons: Geist / Radix / shadcn / Linear

### 3.1 Geist

Philosophy: Swiss modernism, engineering precision, black-and-white clarity.

Practical takeaways:

- Treat type as the brand anchor, not only the logo.
- Use near-zero-color hero sections when the type system is strong enough.
- Let code blocks become product proof.
- Self-host through `next/font` and the `geist` package.

### 3.2 Radix Colors

Philosophy: 12 semantic scale steps with explicit jobs. Steps 1-2 are backgrounds, 3-5 are component states, 6-8 are borders, 9-10 are solid fills, and 11-12 are text. [DeepWiki's breakdown](https://deepwiki.com/radix-ui/website/5.3-color-system) adds the APCA-oriented reading of those roles.

Practical takeaways:

- Use fixed steps for semantic states instead of arbitrary opacity.
- Use light and dark scales with the same token names.
- Use alpha variants for overlays rather than hand-written rgba.
- Prefer perceptual contrast thinking over old ratio-only habits.

### 3.3 shadcn/ui

Philosophy: you own the code. It is not a black-box npm package.

Practical takeaways:

- The token contract is the product.
- Every semantic color needs a foreground pair.
- Drive radii from one root token.
- Use registries for team component distribution.

### 3.4 Linear Method

[Linear Method](https://linear.app/method) is opinionated software thinking applied to product operations. The page says:

> There is a lost art of building true quality software. To bring back the right focus, here are the foundational ideas Linear is built on.

Practical takeaways:

- Write tasks, not user stories.
- Keep cycles short.
- Do not reinvent terms.
- Let design and engineering work in parallel.
- Keep pull requests small.
- Write changelogs. This is why Linear, Vercel, and Resend changelogs feel like real editorial products.

## 4. Chinese Localization: The CJK Layer

The Silicon Valley visual system is easy to copy. The hard part is making it work for Chinese.

### 4.1 Pangu Spacing

[vinta/pangu.js](https://github.com/vinta/pangu.js) is the de facto tool for spacing between CJK and Latin text:

```html
<script src="pangu/dist/browser/pangu.umd.js"></script>
<script>
  document.addEventListener("DOMContentLoaded", () => {
    pangu.autoSpacingPage();
  });
</script>
```

Do not run it over raw Markdown. It can break links and code blocks. Apply it after HTML render or only to plain text nodes.

### 4.2 The CJK CSS Set

Chinese article typography needs this layer:

```css
html[lang="zh"] {
  word-break: keep-all;
  line-break: strict;
  overflow-wrap: break-word;
  text-wrap: balance;
  line-height: 1.75;
}
```

### 4.3 Fonts and Subset CDNs

The problem with Chinese fonts is size. Full Source Han Sans or Noto Sans CJK files can be multiple megabytes. The solution is Unicode-range subsetting through a CDN.

- [Source Han Sans / Noto Sans CJK](https://github.com/adobe-fonts/source-han-sans) is the open default.
- [LXGW WenKai](https://github.com/lxgw/LxgwWenkai) has become one of the most loved Chinese blog body fonts. [CMBill/lxgw-wenkai-web](https://github.com/CMBill/lxgw-wenkai-web) provides easy web packaging.
- LXGW WenKai Screen improves screen reading contrast.
- ZeoSeven Fonts and related Chinese web-font projects provide Unicode-range delivery so the browser downloads only the glyphs it needs.

### 4.4 Chinese Independent Blog Cases

- guangzhengli: Hugo theme plus [nextjs-blog-template](https://github.com/guangzhengli/nextjs-blog-template), with Giscus, RSS, Xiaohongshu links, and bilingual publishing.
- Ruan Yifeng: old-school Movable Type, dense link lists, system fonts, and plain HTML longevity.
- Zhang Xinxu: WordPress, high-density CSS writing and demos.
- Yihui Xie: [hugo-xmin](https://github.com/yihui/hugo-xmin), roughly 140 lines of HTML and CSS.
- Anthony Fu: [antfu.me](https://antfu.me/), Nuxt + Vite + UnoCSS, with refined hover motion and personal-site integration.

guangzhengli's template is currently one of the most complete Chinese-community replications of the Silicon Valley engineering blog pattern: content under `src/content/blog`, config in `src/lib/config.ts`, Giscus, RSS / Atom / JSON Feed, Xiaohongshu / WeChat / Buy Me a Coffee links, and edge/runtime options.

### 4.5 Local Critique and Adaptation

Chinese developers on Jike, V2EX, and Juejin have largely absorbed shadcn/ui, Tailwind v4, Geist, and Linear design as a shared taste layer. At the same time, the criticism is fair: [LogRocket's Linear design review](https://blog.logrocket.com/ux-design/linear-design/) points out that this style can make SaaS sites feel identical.

The strongest Chinese adaptation combines engineering minimalism with Chinese editorial texture: LXGW WenKai body text, Geist Mono code, Anthropic-style ivory surfaces, and a denser link tradition closer to Ruan Yifeng or SSPAI.

The practical obstacles are:

- Whether to run Pangu spacing at render time or storage time. Render time is safer.
- CJK font FOUC, which requires `font-display: swap` and compatible fallbacks.
- Different line-height needs for Latin and Chinese.
- CJK comments inside code blocks, where mono font fallback can break alignment.

## 5. Implementation Checklist: Next.js + Sanity

### Token Layer

- Use Tailwind CSS v4 with `@import "tailwindcss"` and `@custom-variant dark (&:is(.dark *))`.
- Use OKLCH instead of hex or HSL for new tokens.
- Define semantic tokens with foreground pairs.
- Provide both `:root` and `.dark`.
- Expose variables through `@theme inline`.
- Use `@radix-ui/colors` as the scale source.

### Font Layer

- Self-host Geist or Inter through `next/font/local`.
- Load CJK fonts through a subset CDN.
- Always use `font-display: swap`.
- Use Geist Mono, JetBrains Mono, or Sarasa Mono for code.

### Component Layer

- Initialize shadcn with `new-york`, neutral base color, and CSS variables.
- Use CVA for variants.
- Use `cn()` as `clsx + tailwind-merge`.

### Content Layer

- Product publishing: Sanity + Studio + `@portabletext/react` + Shiki.
- Engineering blog: Markdown in git + Velite or Content Collections.
- Docs: Fumadocs + Twoslash.
- Keep custom MDX components centralized.
- Do not start new work on Contentlayer.

### Code Blocks

- Use Shiki.
- Use dual themes.
- Add filename chrome, line highlights, diffs, and copy.
- Add Twoslash if TypeScript hover matters.

### Performance and SEO

- Use `@vercel/og` for dynamic OG.
- Use App Router, RSC, ISR, and static params.
- Ship sitemap, robots, RSS, and Article JSON-LD.
- Use `next-themes` and hydration-safe dark mode.

### View Transitions

- Use `experimental.viewTransition` or a local `document.startViewTransition` wrapper.
- Use shared element morph for list-to-detail transitions.
- Always respect reduced motion.

### CJK

- Use Pangu spacing after render, not on source Markdown.
- Add `word-break: keep-all`, `line-break: strict`, `overflow-wrap: break-word`, `text-wrap: balance`, and `line-height: 1.75`.

### Search, Comments, Deployment

- Use Pagefind or Algolia DocSearch.
- Use Giscus for comments.
- Deploy to Vercel when the site is Next.js.
- Track LCP < 2.0s, CLS < 0.05, and INP < 200ms.

## 6. Ten Decisions

1. If you are starting today, fork [guangzhengli/nextjs-blog-template](https://github.com/guangzhengli/nextjs-blog-template), change the tokens, and ship in thirty minutes.
2. Do not choose Contentlayer for a new project.
3. Use Shiki dual themes for code.
4. Avoid pure `#000` dark mode; use warm near-black.
5. Generate OG images dynamically.
6. Treat typography as identity.
7. Add View Transitions, but respect reduced motion.
8. Do not wrap shadcn primitives in unnecessary abstraction.
9. Add a real CJK typography layer.
10. Use LCP < 2.0s, CLS < 0.05, and INP < 200ms as practical thresholds.

## 7. Caveats

- Anthropic's public fallback fonts are not the same as its internal Anthropic Sans / Serif / Mono.
- Geist Sans and Inter are close enough that switching from Inter to Geist may not matter unless Geist Mono and brand consistency are part of the reason.
- Tailwind v4's OKLCH palette is not a purely linear generated scale. See [The Mystery of Tailwind Colors (v4)](https://dev.to/matfrana/the-mystery-of-tailwind-colors-v4-hjh).
- PortableText and MDX are not cheap to migrate between once many posts exist.
- View Transitions still require graceful fallback, especially for Safari.
- [Anthropic Claude Design](https://www.datacamp.com/blog/claude-design) is interesting, but still a research preview and not a replacement for explicit tokens and components.
- Do not run `pangu.js` against raw Markdown.
- Domaine Display is a commercial Klim Type Foundry font, and OpenAI Sans is not generally licensed. Use IBM Plex Serif, Newsreader, Inter, or Geist when licensing matters.

## Reference Index

- [Tailwind CSS v4.0 announcement](https://tailwindcss.com/blog/tailwindcss-v4)
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- [Radix Colors scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)
- [Linear Method](https://linear.app/method)
- [Vercel Geist](https://vercel.com/font)
- [The Birth of Geist](https://basement.studio/post/the-birth-of-geist-a-typeface-crafted-for-the-web)
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

If this was useful, I would love to hear how your own blog is built and which stack you ended up choosing.
