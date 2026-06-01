---
name: nebutra-bilingual-blog-publishing
description: Use when the user asks to publish, repost, translate, update, maintain, or verify Nebutra blog posts, especially bilingual Sanity posts, authorized reposts, blog cover/inline image generation, image2 editorial graphics, or Nebutra blog UX/content QA.
---

# Nebutra Bilingual Blog Publishing

## Operating Standard

Publish Nebutra blog posts as paired localized articles, not as ad hoc pages. The default outcome is:

- one English Sanity post and one Chinese Sanity post
- the same `translationKey`
- localized slugs under `/blog/<slug>` and `/zh/blog/<slug>`
- semantic cover art and, when useful, inline editorial graphics generated with image2
- structured PortableText and whitelisted React design-system blocks for tables, quotes, code, math, Mermaid, callouts, stats, CTAs, references, and source attribution
- verified live URLs, images, language switch links, and article UX

Use the repo’s existing pipeline first. In `Nebutra-Sailor`, the durable publishing entrypoint is `apps/studio/scripts/publish-blog-post.mjs`; reusable blog rules live in `packages/commerce/blog`.

Markdown is an input adapter, not the content model. Sanity's target model is PortableText JSON plus controlled custom objects rendered by the Nebutra React design system. Do not flatten rich HTML, component drafts, or structured documents into plain Markdown when their semantic structure can be preserved.

## Completion Gates

For original Nebutra posts, semantic cover art is a hard completion gate, not an optional enhancement. Missing input images do not justify skipping the cover; generate Nebutra editorial cover art unless the user explicitly asks for text-only publishing or image generation/upload is blocked.

Do not call an original post "published", "complete", or "fully verified" until all required gates pass:

- bilingual Sanity siblings exist or the user explicitly requested one language only
- both siblings share the same `translationKey`
- a visual plan exists for the article
- a cover image is generated or an explicit user-approved no-cover exception is recorded
- the cover is uploaded via `mainImage` for each localized sibling
- live verification confirms the article route and cover image render

If any gate cannot be completed, report the post as partially published and name the missing gate. Do not convert "no source image was provided" into a no-cover exception.

## Decision Tree

0. **Unknown or mixed input**: classify the modality and intent before writing. Load `references/intake-intent-classifier.md` when the user provides a URL, WeChat article, pasted HTML, PDF/DOCX, image/screenshot, audio/video, archive, React/component draft, or mixed materials.
1. **Original Nebutra post**: preserve the user’s argument and voice, create true English/Chinese localized siblings, generate Nebutra editorial imagery, publish both.
2. **Authorized repost**: confirm the user has stated they have repost rights, preserve source attribution near the top, include the original URL, author, publisher, and repost note, then localize only if requested or useful.
3. **Update existing article**: identify existing slug and `translationKey`, patch the affected language(s), keep source and translation relationships intact.
4. **UX or renderer fix**: route through reusable blog package and renderer rules. Do not make one-off visual hacks if the issue belongs in PortableText normalization, cover governance, CJK prose, TOC, copy/share, or Sanity asset validation.
5. **Rich content or component-grade draft**: preserve structure through a canonical article AST and PortableText custom blocks. Load `references/portabletext-content-model.md`.

If the user only provides one language, create the other language unless they explicitly ask for single-language publication. "真双语" means localized sibling articles with language-switch UX, not two separate unrelated posts and not a side-by-side mixed-language article.

## Workflow

### 0. Classify Intake and Intent

Before treating the input as article text, identify:

- source modality: Markdown/plain text, webpage URL, WeChat Official Account URL, HTML rich text, PDF, DOCX, image/screenshot, audio/video, archive, or mixed source bundle
- user intent: original publication, authorized repost, translation/localization, extraction/cleanup, update existing post, or UX/debug request
- rights posture: original, explicitly authorized repost, public reference only, or unclear
- extraction confidence: complete, partial, blocked, or needs user-provided export
- structure risk: tables, footnotes, code, LaTeX, Mermaid, images, captions, references, embeds, callouts, stat cards, CTA blocks, diagrams, component layouts, or social-platform-only formatting

Do not start rewriting until this classification is clear enough to avoid losing source links, authorship, rights, tables, media, or citations.

### 1. Normalize Into Canonical Article AST

- Extract title, subtitle/description, date, author, tags, categories, target audience, central thesis, and source links.
- Choose a stable `translationKey` without language suffix, for example `think-different-ai-homogenization`.
- Use language-specific slugs, for example:
  - English: `think-different-ai-homogenization`
  - Chinese: `think-different-ai-homogenization-zh`
- Preserve every URL the user included, regardless of input format. Do not silently drop reference links.
- Build a canonical article AST before choosing an output adapter:
  - prose blocks, headings, lists, links, references, and footnotes
  - rich blocks such as `calloutBlock`, `comparisonTable`, `statGrid`, `diagramBlock`, `codeBlock`, `mathBlock`, `quoteBlock`, `sourceCard`, `ctaBlock`, `imageSet`, `embedBlock`, and `componentBlock`
  - raw-source attachments for anything that cannot be safely represented yet
- Use Markdown only for simple prose or as a compatibility serialization for the current publishing script. For rich content, preserve the AST as PortableText custom objects and load `references/portabletext-content-model.md`.

### 2. Localize, Do Not Literal-Translate

Chinese and English should read like native Nebutra blog posts in their own language. Keep facts, citations, argument order, and authorial stance aligned, but localize:

- title rhythm
- excerpt
- section headings
- idioms and analogies
- CTA and attribution language
- metadata tags where needed

Do not translate brand names, product names, or source titles unless the source itself has a known localized name.

### 3. Plan Editorial Graphics With image2

Before generating images, write a short visual plan. Load `references/image2-visual-system.md` for every original post, because original posts require at least a cover unless the user explicitly opts out.

Default image planning:

- short announcement: 1 cover
- essay or founder note: 1 cover plus optional pull-quote/social image
- research/report/tutorial: 1 cover plus 2-4 inline graphics
- comparison/review: cover plus comparison plate or matrix visual
- authorized repost: use original media only if rights allow; otherwise create Nebutra editorial cover and clearly mark as repost

Never hardcode random SVG art as the creative deliverable. SVG or deterministic placeholders are temporary fallbacks only; the intended art direction must be image2-based and semantic.

### 4. Dry-Run Sanity Publishing

Load `references/publishing-runbook.md` for concrete commands.

Dry-run both languages first. Confirm that the parser reports expected structured blocks such as `table`, `code`, `mathBlock`, `mermaid`, `calloutBlock`, `statGrid`, `sourceCard`, or `ctaBlock` instead of raw Markdown text. If the current script cannot ingest a needed rich block, stop and route the task to a PortableText writer or renderer upgrade rather than flattening it.

For original posts, include `--main-image` in dry-run and publish commands after cover generation. If `mainImage` is missing, stop before final publish unless the user explicitly approved a no-cover exception.

Use one shared `translationKey`:

```bash
pnpm --filter @nebutra/studio blog:publish -- \
  --file /tmp/nebutra-blog/<slug>.zh.md \
  --language zh \
  --slug <zh-slug> \
  --translation-key <translation-key> \
  --title "<zh-title>" \
  --excerpt "<zh-excerpt>" \
  --author "Tseka Luk" \
  --categories "Nebutra Originals,<category>" \
  --main-image /path/to/cover.png \
  --dry-run
```

Repeat for English with `--language en`.

### 5. Publish and Revalidate

Publish only when `SANITY_API_TOKEN` is present or the user completes `sanity login`/token setup. Never print secrets. The script revalidates by default when configured; do not add `--no-revalidate` unless debugging.

If the user asks where to provide credentials:

- `SANITY_API_TOKEN`: shell env, `.env.local`, Vercel env, or the current terminal session; it needs Sanity document write permission.
- `SANITY_WEBHOOK_SECRET`: optional, used for signed blog revalidation.

### 6. Verify the Result

Verify the exact URLs:

- `https://nebutra.com/blog/<en-slug>`
- `https://nebutra.com/zh/blog/<zh-slug>`

Check:

- no 404
- language switch works both directions
- cover and inline images load without broken-image fallback
- alt text exists and matches the article
- TOC, tables, code, math, Mermaid, quotes, copy actions, sharing, comments, and related posts render correctly for the article type
- source attribution is visible for reposts
- OG image route is not broken if touched

For renderer or package changes, prefer targeted checks over full builds unless the user asks for a build:

```bash
pnpm --filter @nebutra/blog test
pnpm --filter @nebutra/blog typecheck
pnpm --filter @nebutra/studio test -- publish-blog-post
```

## Closeout

Report:

- English and Chinese URLs
- `translationKey`
- cover/inline image assets and where they were placed
- commands actually run
- anything not verified live

Do not say "published" if only dry-run succeeded. Do not say "tested" unless the relevant command actually ran in the current turn.
