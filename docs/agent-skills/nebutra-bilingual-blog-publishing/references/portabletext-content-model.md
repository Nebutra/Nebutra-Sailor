# PortableText Content Model

Use this reference when the input is richer than simple Markdown: HTML rich text, WeChat exports, webpages with custom layout, DOCX/PDF with figures, or React/component-style drafts.

## Principle

Sanity is not a Markdown store. The target shape is:

```text
source input -> intake parser -> canonical article AST -> Sanity PortableText + custom objects -> Nebutra React renderer
```

Markdown is only one source adapter and one fallback serialization. Do not downgrade rich content to Markdown when semantic blocks can be preserved.

## Canonical Article AST

Represent the article as:

- metadata: title, subtitle, excerpt, author, publisher, date, source URL, language, translationKey, tags, categories
- body blocks: paragraph, heading, list, quote, image, table, code, math, mermaid, embed, callout, stat, CTA, source card
- assets: cover, inline images, generated visuals, original authorized media, raw source archive
- relationships: language sibling, source attribution, related posts, series/tag links

## Whitelisted Custom Blocks

Map rich sources into these blocks. If a block is unsupported by the current renderer, preserve the raw source and stop before flattening.

| Intent | PortableText object | Renderer responsibility |
|---|---|---|
| TL;DR, note, warning, insight | `calloutBlock` | icon, tone, copy action, accessible label |
| Comparison matrix | `comparisonTable` | responsive table/card mode |
| Numeric highlights | `statGrid` | semantic figures, captions, mobile stacking |
| Architecture/process diagram | `diagramBlock` | Mermaid or image2 asset, lazy/error state |
| Code | `codeBlock` | Shiki, filename, diff/highlight lines, copy |
| LaTeX | `mathBlock` / inline math mark | KaTeX rendering |
| Pull quote/template | `quoteBlock` | large quote mark, copy icon only |
| Reference/source | `sourceCard` | publisher, author, URL, credibility metadata |
| CTA | `ctaBlock` | design-system CTA, not arbitrary HTML |
| Image set | `imageSet` | cover/inline/social roles, alt, crop data |
| Social/media embed | `embedBlock` | provider allowlist and privacy fallback |
| Controlled React component | `componentBlock` | only whitelisted component keys and props |

## HTML and Component Mapping

- Strip presentation-only wrappers, tracking pixels, inline scripts, and platform chrome.
- Preserve links, captions, tables, footnotes, code, formulas, embeds, and component intent.
- Convert design-like sections by intent, not by CSS class name.
- Never store arbitrary JSX or raw script in Sanity. Use `componentBlock` with a whitelisted `componentKey` and validated props.
- Keep a `rawSource` attachment when confidence is partial or a renderer gap exists.

## Publishing Decision

Use Markdown serialization only when all important structures can survive:

- headings, paragraphs, lists
- simple blockquotes
- simple tables
- code fences
- Mermaid fences
- inline/block math

Use PortableText custom objects when the source contains:

- callout cards
- stat grids
- CTA regions
- source/reference cards
- rich embeds
- multi-image figures
- React/component layouts
- diagrams whose semantics would be lost as prose

## Quality Gate

Before publishing, confirm:

- no rich block became plain paragraph filler
- no table became raw pipes in the live renderer
- no arbitrary HTML/JS was stored as trusted content
- unsupported components are archived as raw source and explicitly reported
- bilingual siblings preserve the same structure where useful, while localizing copy
