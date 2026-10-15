# Landing frontend review: nebutra.com against Vercel, Cursor, Linear, a16z, basement

- **Date**: 2026-10-10 (work finished 2026-10-15)
- **Scope**: `apps/landing`, every public route of nebutra.com (44 routes: home, Sailor, pricing,
  investors, journal + a post, changelog + a release, about and its five subpages, features + two
  domains, ideas, building, sleptons, news, roadmap, careers, AI models, licensing, open, playbook,
  refer, security, showcase, solutions + one, opc, the legal set, status, 404)
- **Method**: the one in `2026-10-10-design-site-benchmark.md`. Every route captured at 1440 and 390,
  light and dark (176 captures), on a production build (`next build --webpack`, `next start`), and
  audited with Playwright for overflow, clipping, contrast, heading order, landmarks, image sizing,
  HTTP failures and layout shift. Mechanical counts come from the repo's ratchets.
- **Related**: `docs/design-system/hover-motion.md`, ADR 2026-09-10 frontend constitution,
  `apps/landing/src/nebutra/DESIGN.md`

## Benchmark

The owner's direction: a16z layout, basement positioning, Vercel spec, Cursor detail, Linear plus the
brand VI colour. References captured at 1440 and 390: vercel.com, vercel.com/pricing, cursor.com,
cursor.com/blog, linear.app, linear.app/changelog, a16z.com, basement.studio.

| Dimension | References | nebutra.com, before |
| --- | --- | --- |
| Page frame | one left gutter for every page (a16z, Linear 80px, Vercel 24px) | home, journal, Sailor, features on `px-8 xl:px-16`; about subpages, blog post, changelog, licensing on centred `container mx-auto max-w-4xl`: two frames on one site |
| Labels | sentence case, sans, 13–14px (Vercel "Hobby", Linear tabs, Cursor "Sep 21, 2026 · Research") | 153 class strings setting `uppercase` with `font-mono` or letter-spacing: "CHAPTER I · STRATEGIC POSITION", "CORE OBJECTIVES", "— NEBUTRA CORE ECOSYSTEM VISION" |
| Changelog | Linear: date column, title, real screenshot per release, prose in full | a fixed black hero band in light mode, the same dashboard still on every release, prose hidden behind a dialog, hardcoded English |
| Hover | controls change colour; exhibits are still (Linear feature panels, Vercel template cards) | capability cards, the design-system bento and provider chips rose on hover; essay covers zoomed on the 1000ms cinematic entrance rail |

## Measurements

| Check (44 routes × 4 modes unless noted) | Before | After |
| --- | --- | --- |
| Horizontal page scroll at 390 | 0 | 0 |
| Elements clipped by their own box | 16 | 6 (the code-execution glyph badge and the RBAC matrix at 390, below) |
| Text under WCAG AA (contrast) | 82 | 82 (all in features glyph/code chrome; see routing) |
| Heading level skips (1440 light) | 3 (changelog h1→h3, licensing h1→h3, contact h1→h3) | 0 |
| Oversized images (decoded > 2.5× rendered) | 12 (changelog: 1200px still for a 356px slot) | 0 |
| Same-origin HTTP failures during a visit | 49 | 8 (the 404 page's own 404 and `/docs`, which Cloudflare serves in production) |
| Layout shift > 0.1 | 0 | 0 |
| Unnamed links/buttons | 0 | 0 |
| `uppercase` + mono/tracking labels (new guard) | 153 | 82 |
| Arbitrary typography, landing entries (`arbitraryTypography`) | 764 | 685 |
| Hover-motion violations, landing (`hoverMotion`) | 37 | 32 |
| Raw `<button>` where `Button` would do, landing | 40 | 38 |
| Raw clipboard writes, landing | 7 | 6 |

## Ranked defect list

1. **Every release URL 404'd.** `proxy.ts`'s catch-all matcher skips any path containing a dot as a
   static file, so `/changelog/1.7` (the canonical, unprefixed URL, listed in the sitemap and linked
   from the changelog) never reached the locale rewrite. `/en/changelog/1.7` worked; the URL anyone
   was given did not. **Fixed**: `/changelog/:version` is matched explicitly.
2. **A missing blog post answered 500.** `generateMetadata` called `connection()` while the page
   404'd before touching request data, a prerender bailout Next serves as a 500. `/about` prefetched
   two such links on every visit. **Fixed**: metadata resolves the cached article first and stays
   static for a missing slug. The response is now the not-found document with `noindex`; its status
   is still 200 (see Left open).
3. **The changelog was off-system.** Fixed black hero in light mode, one dashboard still repeated on
   every release ("no mocks"), a sticky filter bar at `top-0` that slid under the site bar, a
   `w-[200vw]` rule, `h1 → h3`, hardcoded English, `hover:bg-muted` on `bg-muted` (a hover that does
   nothing), raw buttons and a raw clipboard write. **Rebuilt** on Linear's shape and the site's grid.
4. **Mono uppercase micro-labels** — the "AI look" DESIGN.md forbids — concentrated in the about
   subpages (58 of 153). **Fixed** 70, with a shrink-only guard for the rest.
5. **Exhibits that moved under the pointer** (capability cards, design-system bento on
   `duration-reveal`, provider chips, use-case tabs), invisible to `lint-hover-motion` because the
   lift sat on a non-interactive element. **Fixed**: they change background only.
6. **/sailor capability section** broke the page grid: centred heading, uppercase pill. **Fixed**:
   left on the grid, sentence-case label. Its RLS sample clipped at 390. **Fixed**: it scrolls.
7. **Heading semantics**: essay titles were `<p>` (home, journal), plan and contact cards skipped a
   level. **Fixed**.
8. **i18n**: "Essay ·", "All", the footer's `aria-label`, the whole changelog. **Fixed** (en +
   zh-Hans; other languages fall back to English until the translation workflow runs).
9. **Two page frames** (centred `max-w-4xl` on about subpages, the blog post, licensing vs the
   gutter everywhere else). **Open**: it is a layout change per page and the whitepaper/blog post
   need an owner look first.

## Guards added

- `scripts/lint-eyebrow-labels.mjs` (in `pnpm lint`, `governance.config.json → eyebrowLabels`,
  shrink-only, baseline 82): a string in `apps/landing/src/**/*.tsx` that sets `uppercase` together
  with `font-mono` or a `tracking-*` class. Probed with a known-bad fixture in
  `tests/architecture/lint-guards-actually-guard.test.ts`.

## Routed (shared primitives and tokens; not edited here)

- **`--muted-foreground` on `--muted` under nebutra-site, light**: 3.11:1 at 11px (features glyph
  rows: "Checking environment", "Building project"). Either the pair needs a darker muted ink on the
  muted surface, or `lint-token-pairing` should refuse the pair.
- **Code-block syntax colours** (`react-syntax-highlighter` theme used by the features showcases):
  comments 4.02:1, line numbers 3.41:1, CSS at-rules 1.42:1 on the light card.
- **`@nebutra/brand` `Logo` / `Logomark`** load from `https://cdn.nebutra.com/brand/logo/*.svg`: the
  site's header mark depends on a third-party round trip (≈1.3s cold). One capture rendered alt text
  in place of the wordmark. The SVGs are in `apps/landing/public/brand/`; the component could inline
  them or use the same-origin copy.
- **Next 16 `notFound()` on blocking routes** (`instant = false`, blog post and release pages)
  answers 200 with `noindex` and also emits `index, follow` from the layout metadata — two robots
  tags. Framework/layout level, not a page fix.

## Left open

- The 82 remaining eyebrow labels: 29 inside feature glyphs (miniature product UI, where small
  caps imitate the product), the rest across showcases and mega-menus of the template chrome.
- Two page frames (item 9).
- Copy that is itself upper case: the whitepaper eyebrow `{brandNameUpper} BUSINESS WHITEPAPER` and
  four section badges in `messages/en.json`. Changing them changes placeholders in 33 locale files.
- `/about/innovation` and the blog post time out on a cold first load twice in 176 loads (60s), on
  `next start` locally; not reproduced on retry.
- The RBAC access-matrix card overflows its box by 10px at 390; the code-execution glyph's runtime badge by 27px at 1440 (the row now wraps, the badge alone is wider than the card).

Captures (local, not committed): scratchpad `review-landing/{benchmark,before,after,compare}`.
