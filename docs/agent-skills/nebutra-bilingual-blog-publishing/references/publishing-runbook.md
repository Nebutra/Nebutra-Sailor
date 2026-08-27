# Nebutra Sanity Blog Publishing Runbook

Use this reference for concrete commands and verification when publishing Nebutra blog posts.

## Repo Entry Points

- Studio script: `apps/studio/scripts/publish-blog-post.mjs`
- Studio package: `@nebutra/studio`
- Blog rules package: `@nebutra/blog` at `packages/commerce/blog`
- Cover governance: `packages/commerce/blog/src/covers.ts`
- Blog types and PortableText structures: `packages/commerce/blog/src/types.ts`
- Rich content model: `references/portabletext-content-model.md`

## Publish Script Capabilities

`publish-blog-post.mjs` can:

- create or update one localized Sanity post
- upload a local image via `--main-image`
- find/create author and categories
- parse Markdown headings, quotes, lists, links, tables, code, Mermaid, inline math, and block math when Markdown is the selected input adapter
- revalidate the site unless `--no-revalidate` is passed

Markdown parser support is a convenience path. For rich HTML, component-grade drafts, or design-system blocks, publish through PortableText custom objects instead of degrading everything to Markdown.

## Required Metadata

Every localized sibling should have:

- `language`: `en` or `zh`
- `slug`: language-specific slug
- `translationKey`: shared key across languages
- `title`: localized
- `excerpt`: localized
- `author`: usually `Tseka Luk`, or original author for reposts
- `categories`: use `Nebutra Originals` for original posts, `Repost` for reposts, plus topical categories
- `mainImage`: generated or authorized source image

For original Nebutra posts, `mainImage` is required for a complete publish. Do not treat a missing user-provided image as permission to omit it; generate a cover or record an explicit user-approved no-cover exception.

## Dry Run

Prefer dry-run before any write:

```bash
pnpm --filter @nebutra/studio blog:publish -- \
  --file /tmp/nebutra-blog/<slug>.zh.md \
  --language zh \
  --slug <zh-slug> \
  --translation-key <translation-key> \
  --title "<localized title>" \
  --excerpt "<localized excerpt>" \
  --author "Tseka Luk" \
  --categories "Nebutra Originals,<topic>" \
  --main-image /absolute/path/to/cover.png \
  --dry-run
```

If package script resolution is broken, direct Node is acceptable from the repo root:

```bash
node apps/studio/scripts/publish-blog-post.mjs \
  --file /tmp/nebutra-blog/<slug>.en.md \
  --language en \
  --slug <en-slug> \
  --translation-key <translation-key> \
  --title "<localized title>" \
  --excerpt "<localized excerpt>" \
  --author "Tseka Luk" \
  --categories "Nebutra Originals,<topic>" \
  --main-image /absolute/path/to/cover.png \
  --dry-run
```

For original posts, dry-run without `--main-image` is only a parser check. It is not a complete publish dry-run unless a no-cover exception has been approved.

## Production Publish

Set credentials in the shell, local env, or platform env. Do not print them:

```bash
export SANITY_API_TOKEN=...
export SANITY_WEBHOOK_SECRET=...
```

Then rerun the dry-run commands without `--dry-run`.

`SANITY_API_TOKEN` needs document write permission. `SANITY_WEBHOOK_SECRET` is optional but should be present for signed revalidation.

Original posts must be published with `--main-image <cover-path>` for each localized sibling. If upload fails, stop and report a partial publish rather than publishing text-only by default.

## Repost Requirements

Only repost if the user states they have rights. Add an early attribution block in both languages:

Chinese:

```markdown
**转载说明：** 本文已获得转载授权。原文发布于 <publisher>，作者 <author>。原文链接：<url>
```

English:

```markdown
**Repost note:** This article is republished with permission. Originally published by <publisher>, authored by <author>. Original URL: <url>
```

Do not remove the original URL. If the repost has original media, only reuse it when rights allow; otherwise create new Nebutra editorial images.

## Structured Content Checks

After dry-run, check that special content did not collapse into plain paragraphs:

- Markdown table -> `table`
- fenced code -> `code`
- ` ```mermaid ` -> `mermaid`
- `$$...$$` -> `mathBlock`
- `$...$` -> inline math mark
- rich callout -> `calloutBlock`
- stats/cards -> `statGrid`
- comparison matrix -> `comparisonTable`
- CTA region -> `ctaBlock`
- source/reference entry -> `sourceCard`
- supported embed -> `embedBlock`
- source links -> link marks

If a table appears as raw pipes in the live article, fix the parser/source Markdown, not CSS.
If rich HTML appears as flattened paragraphs, fix the PortableText writer/serializer, not prose styling.

## Targeted Validation Commands

Run only what is relevant unless the user explicitly asks for a build:

```bash
pnpm --filter @nebutra/blog test
pnpm --filter @nebutra/blog typecheck
pnpm --filter @nebutra/studio test -- publish-blog-post
pnpm --filter @nebutra/landing typecheck
```

For a renderer-only CSS/TSX change, add a browser check on the actual article URL or local dev URL. Do not claim visual proof without seeing the page.

## Live Verification

Check both localized URLs:

```text
https://nebutra.com/blog/<en-slug>
https://nebutra.com/zh/blog/<zh-slug>
```

Verify:

- route is not 404
- language switch links go to the sibling
- cover image loads and crops safely on desktop/mobile
- inline images load and have meaningful alt text
- TOC highlights useful headings without crowding the article
- table/code/math/Mermaid render correctly
- copy quote, copy article, share, comments, likes/favorites, related posts, and subscribe CTA do not overlap
- repost attribution is visible when applicable

## Troubleshooting

- **404 on localized URL**: check `slug`, `language`, `translationKey`, and whether Sanity publish succeeded; revalidate if needed.
- **Language switch does nothing**: sibling likely missing or `translationKey` differs.
- **Broken image**: check Sanity asset upload, URL builder, image dimensions, and whether local path existed during publish.
- **Generic or unrelated cover**: redo the image2 plan; do not paper over with fallback art.
- **Raw Markdown table appears**: fix content ingestion/serializer; do not rely on visual styling.
- **Mermaid breaks the article**: Mermaid should be a PortableText object with lazy rendering and an error state, not a generic code block.
- **Math rendering needed**: use KaTeX for inline and block math; keep Mermaid separate.
- **Rich source flattened**: switch from Markdown serialization to canonical AST -> PortableText custom objects. Preserve raw source as evidence until the renderer supports the block.
