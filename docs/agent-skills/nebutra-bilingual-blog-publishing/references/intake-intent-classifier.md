# Intake and Intent Classifier

Use this reference before writing or publishing when the user's input is not a clean Markdown article.

## First Classification Pass

Record this before extraction:

```text
INTAKE
- Source modality: markdown / plain text / webpage URL / WeChat URL / HTML rich text / PDF / DOCX / image / screenshot / audio / video / archive / mixed
- User intent: original publish / authorized repost / translate / summarize / clean up / update existing post / debug blog UX
- Rights posture: original / explicitly authorized / reference-only / unclear
- Extraction confidence: complete / partial / blocked / needs user export
- Must preserve: URLs, author, publisher, title, date, captions, tables, code, formulas, diagrams, images, component intent
- High-risk structures: tables, footnotes, code, LaTeX, Mermaid, social embeds, image-only text, paywall, lazy-loaded media, callouts, stats, CTAs, component layouts
- Next action:
```

If rights posture is unclear for reposting a third-party article, ask for authorization or convert the task into a summary/commentary with citation instead of republishing the full article.

## Modality Rules

### Markdown or Plain Text

- Treat as source of truth unless the user says it is a draft.
- Preserve all user-provided links.
- Normalize into blog Markdown with headings, tables, quotes, code fences, math, and Mermaid where appropriate.

### Webpage URL

- Browse or fetch the page when network access is available.
- Extract title, author, date, publisher, canonical URL, body, images, captions, and references.
- If content is blocked, ask the user for exported HTML, Markdown, screenshot, or source text.
- For third-party pages, do not republish full content unless the user states they have permission.

### WeChat Official Account URL

- Treat `mp.weixin.qq.com` as a rich source that may block direct extraction.
- Preserve the original URL and public-account name.
- If extraction fails, ask for copied article text, browser-exported HTML, or screenshots/PDF export.
- If authorized reposting is stated, include a visible repost note in both languages.
- Do not reuse WeChat-hosted images unless rights allow and the image URLs are durable enough for Sanity ingestion; prefer uploading authorized media to Sanity.

### HTML Rich Text

- Parse structure before visual cleanup.
- Preserve `<a href>`, headings, tables, lists, blockquotes, image captions, code/pre blocks, footnotes, embeds, callouts, stat cards, CTA regions, and diagram containers.
- Convert presentation-only spans/styles into semantic PortableText objects first; Markdown serialization is only a fallback for simple prose.
- Drop tracking pixels and platform-specific wrapper markup.
- If the HTML contains design-system-like components, infer the component intent and map to a whitelisted block such as `calloutBlock`, `statGrid`, `comparisonTable`, `sourceCard`, `ctaBlock`, `diagramBlock`, `imageSet`, or `componentBlock`.
- Preserve raw HTML as an archival source attachment when conversion confidence is partial.

### React or Component Draft

- Treat React/component-like input as an intent-bearing design artifact, not as article prose.
- Identify which parts are content, which are layout, and which are reusable Nebutra design-system blocks.
- Map only to whitelisted PortableText custom objects. Do not publish arbitrary JSX/HTML from the user into Sanity.
- Preserve component props and visual intent in a source manifest when the renderer does not yet support the block.

### PDF or DOCX

- Extract text and reading order first.
- Preserve figures, captions, tables, footnotes, formulas, and references.
- If extraction order is poor, use page screenshots/OCR only for the damaged sections.
- Do not publish until the extracted article is reviewed for missing headings or merged paragraphs.

### Image or Screenshot

- Use OCR to extract text, then compare against the image for missing captions, tables, and source labels.
- Treat screenshots as low-confidence extraction unless the text is short and clear.
- Generate new Nebutra editorial graphics rather than using screenshots as article art, unless the screenshot is itself evidence.

### Audio or Video

- Transcribe first.
- Identify whether the intended output is a transcript, edited article, summary, or commentary.
- Preserve speaker names, timestamps for quotes if useful, and source URL.
- Do not invent citations from spoken claims; mark unverifiable claims as such or ask for links.

### Mixed Source Bundle

- Build a source manifest:
  - each source
  - modality
  - rights status
  - extraction status
  - role in final article
- Decide the canonical article body before creating visuals.
- Use inline graphics only where they clarify the argument, not merely because files exist.
- If sources include both prose and rich UI examples, choose a canonical article AST and attach the original rich source as reference evidence.

## Repost vs Commentary

Use this split:

- **Authorized repost**: full article may be republished with attribution and source URL.
- **Commentary/analysis**: summarize, quote only short excerpts, link to the original, and add Nebutra's own analysis.
- **Reference source**: cite as one source among many; do not mirror content.

When the user says "我有转载权", proceed as authorized repost, but still keep attribution visible.

## Extraction Quality Gate

Before publishing, verify:

- no source URL dropped
- no author/publisher/date dropped for reposts
- headings are not flattened
- tables did not become raw pipe text accidentally
- code/math/Mermaid are semantic blocks
- callouts, stat grids, CTA blocks, source cards, embeds, and diagrams are structured PortableText custom objects when present
- images are either authorized source assets or generated Nebutra editorial assets
- article title/excerpt reflect the final localized version
- both languages preserve the same factual claims
