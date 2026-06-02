# RFC B2/B4/B6: Govern Public CMS Rich Content Rendering

Status: Proposed
Date: 2026-06-02
Dimensions: B2 design system and UI maturity, B4 security architecture, B6 test blind spots

## Delta Scope

This proposal covers the expanded public blog/CMS rendering surface added after the 2026-05-31 governance baseline: rich Portable Text rendering, CTA promotion, math, Mermaid diagrams, syntax-highlighted HTML, and a motion-heavy blog index.

No code or configuration was changed by this review.

## Benchmark Posture

The public surface should move closer to the product-quality bar set by 21st.dev, Linear, Vercel, Supabase, and Stripe: expressive, but governed by reusable primitives, keyboard/focus guarantees, content safety contracts, and a small number of intentional rendering escape hatches.

Reference set checked during this review:

- Vercel Web Interface Guidelines: https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
- 21st.dev: https://21st.dev
- Linear: https://linear.app
- Vercel Geist: https://vercel.com/geist
- Supabase UI: https://supabase.com/ui
- Stripe Apps design guidance: https://docs.stripe.com/stripe-apps/design
- Stripe Apps UI extension model: https://docs.stripe.com/stripe-apps/how-ui-extensions-work

The Stripe reference is especially relevant: mature embedded/product UI platforms intentionally constrain arbitrary styling and HTML through approved components, patterns, and sandbox boundaries. Nebutra does not need to copy that exact model, but public CMS rendering should have an equally explicit trust boundary.

## Current State

- `apps/landing-page/src/components/landing/blog-portable-text.tsx` renders KaTeX output through `dangerouslySetInnerHTML` with `strict: false` and `throwOnError: false`.
- The same renderer passes CMS link `href` values directly into anchors and only uses an `http(s)` test to decide `target`/`rel`; non-HTTP schemes are not blocked at this boundary.
- CTA blocks pass `ctaHref` from CMS through `resolveCtaHref`, whose known caller only rewrites `#contact`.
- Mermaid blocks pass CMS text into a client renderer.
- `apps/landing-page/src/components/landing/blog-mermaid-diagram.tsx` initializes Mermaid with `securityLevel: "loose"` and inserts generated SVG through `dangerouslySetInnerHTML`.
- `apps/studio/schemaTypes/post.ts` accepts required text for math and Mermaid blocks, but does not encode renderer policy such as allowed diagram types, max size, or HTML-label constraints.
- `apps/studio/scripts/publish-blog-post.mjs` promotes a recognized section into a CTA block and carries through the source link URL. It also has an ad hoc `BLOG_DISABLE_CTA_PROMOTION` gate.
- `apps/studio/scripts/publish-blog-post.test.mjs` verifies that math and Mermaid fences survive as structured blocks, but it does not cover hostile URLs, Mermaid security-sensitive syntax, oversized diagrams, or CTA promotion edge cases.
- `apps/landing-page/src/__tests__/ui-governance.test.ts` asserts source-string markers such as `useAnimationFrame`, `aria-expanded`, and `copyPageAsMarkdown`; it is useful as a cheap guard but does not prove keyboard, focus, visual, or renderer safety.

## Architectural Tradeoffs

Option A: keep rich CMS blocks, but add a strict renderer contract.

- Pros: preserves editorial power while making public rendering reviewable and testable.
- Cons: requires schema validation, import validation, renderer tests, and clear ownership across Studio, `@nebutra/blog`, and landing.

Option B: temporarily disable the highest-risk rich blocks on public pages.

- Pros: reduces public attack surface quickly.
- Cons: loses the technical storytelling quality that recent blog work is trying to add.

Option C: move rich rendering to a sandboxed or pre-rendered artifact pipeline.

- Pros: better isolation for Mermaid/SVG/HTML and easier caching.
- Cons: heavier architecture and probably premature unless the blog becomes a high-traffic acquisition surface.

Recommended direction: Option A now, with Option C reserved if rich content becomes user-generated, multi-author, or high-volume.

## Decision Information Needed

- Trust boundary for CMS authors: internal maintainers only, contractors, customers, or future community submissions.
- Allowed URI schemes for blog links, citations, and CTA links.
- Whether Mermaid needs HTML labels, external links, or only static flow/sequence/state diagrams.
- Maximum size limits for Mermaid, math, table, and code blocks before rendering is rejected or converted to a fallback.
- Whether rich-content validation belongs in Studio schema, import scripts, `@nebutra/blog`, landing renderer, or all layers with different responsibilities.
- Required browser proof for the blog index and rich post pages: Playwright visual smoke, axe/accessibility checks, keyboard navigation, reduced-motion, and mobile overflow.

## Proposed Decision Path

1. Define a `PublicRichContentPolicy` with allowed block types, URL schemes, diagram capabilities, size limits, and fallback behavior.
2. Make `@nebutra/blog` the portable contract owner for normalized rich content, while Studio owns authoring-time validation and landing owns rendering.
3. Replace source-string-only governance for rich blog surfaces with fixtures that include malicious URLs, long content, renderer failures, reduced-motion, keyboard-only use, and mobile overflow.
4. Decide whether `BLOG_DISABLE_CTA_PROMOTION` is a temporary import escape hatch with an owner and removal date, or a supported feature flag.

## Security Stop Condition

This review did not identify a candidate hardcoded secret in the inspected files. If follow-up work finds a suspected real token, connection string, or private key, stop that item and report only the file and location.

## Non-Goals

- This RFC does not change the CMS schema.
- This RFC does not disable Mermaid, math, CTA blocks, or code rendering.
- This RFC does not weaken any existing tests or lint rules.
