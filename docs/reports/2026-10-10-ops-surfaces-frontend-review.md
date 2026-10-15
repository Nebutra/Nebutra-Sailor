# Ops surfaces frontend review: router, admin, status, forge

- **Date**: 2026-10-10
- **Scope**: `apps/router` (router.nebutra.com), `apps/admin` (admin.nebutra.com), the status pages
  (`apps/landing/src/app/[lang]/(status)`, `components/status`), `apps/forge`
- **Method**: the same one as `2026-10-10-design-site-benchmark.md`. Benchmarks were captured at 1440
  and 390: OpenRouter `/models` and a model page, Vercel AI Gateway models, Together and Fireworks
  catalogs, incident.io, OpenAI, GitHub, Vercel and Linear status pages, and it-tools.tech.
  Then came a mechanical audit with counts, a Playwright overflow/clip check, and a visual pass.
- **Related**: ADR 2026-09-10 frontend constitution, `docs/design-system/hover-motion.md`

## What could be rendered

| Surface | How it was seen |
| --- | --- |
| Router, all 11 routes | Local `next dev` with `AUTH_PROVIDER=dev` and the PGlite preview DB (`db:preview`), zh and en, at 1440 and 390 |
| Router production | router.nebutra.com (public), for the "before" capture |
| Status | status.nebutra.com (public), for the "before" capture; the after state is verified in code only |
| Admin | **Not rendered.** Every page sits behind a Cloudflare Access JWT verified against the team JWKS. There is no dev bypass, and forging an assertion locally was not done. Reviewed from code and tests. |
| Forge | Code audit only (forge.nebutra.com answers 200) |

Router has no theme provider, and its market shell hard-codes light canvas hex. Light and dark
captures were byte-identical: **the router is a light-only app.** That is recorded as an open defect,
not fixed (see Left open).

## Benchmarks: where Router sits

The README aligns Router with 302.AI on purpose (category rail, carousel, greeting panel, card
shelf). That IA was kept. The benchmarks set the quality bar inside it:

- OpenRouter and Vercel ship **one language per locale**. Router on production, with the EN
  locale cookie set, rendered `登录 注册`, `模型实测 / 图片生成`, `查看全部` and `没有账号？注册` next to
  English chrome. The footer had English headings over Chinese links.
- None of the four catalogs prints supply provenance on the public shelf. Router printed
  `可售货架 · 25 · 供给库存 official-openai(27) · 价/上下文 models.dev · inventory∩models.dev` under
  the grid on `/` and `/models`.
- At 390, OpenRouter and Vercel turn the channel or filter bar into a horizontal scroller. Router's
  channel dock wrapped **one CJK character per line** (`应/用/集/市`, a 130px-tall pill), and the
  utility bar wrapped `快捷使用` / `技术支持` onto two lines.

## Defect counts (mechanical audit, non-test source)

| Class | Router before → after | Admin | Forge | Status |
| --- | --- | --- | --- | --- |
| Hard-coded CJK UI lines | 391 → ~40 (comments excluded; what remains is `lib/listing-catalog.ts` operator notes, model-id aliases, brand-mark labels) | 8 → 0 | 209 (not touched) | 0 |
| Arbitrary `text-[Npx]` / `tracking-[…]` | 210 → 0 | 11 → 0 | 40 | 0 |
| `title=` hover-only tooltips | 11 allowlisted → 0 in touched files | 5 → 3 | 6 | 3 → 0 |
| Raw `<button>` | 22 → 15 | 4 | 6 | 1 → 0 |
| Production links to `http://localhost:*` | **5 → 0** (Client channel, footer, 6 App-market rows, Forge card, sign-in `returnTo`) | 0 | 1 → 0 (docs curl sample) | 0 |
| Dead / fake UI | footer Terms/Privacy/Refund/IP all → `/docs`; App market listed six tools that do not exist; "稳定" stability column hard-coded; "probes not wired" placeholder; duplicate Docs button; `暂无轮播物料` empty card → all removed | 2 disabled "batch 2" tabs → removed | — | — |
| Raw hex / rgba in app CSS | 81 / 13 (brand-marks SVG art, market-shell canvas) | 2 | 22 | 0 |
| Overflow at 390 (`scrollWidth > clientWidth`) | 0 → 0; but the channel dock wrapped per character (visual), now fixed | n/a | — | — |

## Ranked defects and what was done

### Router
1. **Dev-port links in production.** `href: "http://localhost:3105"` in `market-taxonomy.ts` (×7),
   `market-footer.tsx` and `market-home.tsx`. `auth-actions` started `returnTo` at
   `http://localhost:3106/` until hydration. Fix: `lib/forge-url.ts`
   (`NEXT_PUBLIC_FORGE_URL || https://${brand.domains.forge}`), and the brand router origin for
   `returnTo`. **Guard:** `scripts/lint-no-localhost-links.mjs` (generic, all apps, shrink-only,
   baseline 28 across 20 files, mostly server env defaults). It is wired into `pnpm lint` and probed
   in `lint-guards-actually-guard.test.ts`.
2. **Mixed-language UI.** About 350 string sites moved into next-intl. New namespaces: `auth`,
   `footer`, `category`, `card`, `banners`, `brandBlurb`, `catalog`, `detail`, `console.*`, about 300
   keys in en / zh-Hans / zh-Hant. Category names go through `useCategoryLabel()`. Provider names
   are now the vendors' own international names (Qwen, Zhipu GLM, 01.AI, Doubao, Hunyuan). Console
   error helpers return message keys, and the playground's "create a key" link keys off the
   `no_active_key` code instead of matching Chinese text.
3. **Fake or dead UI on a buying surface.**
   - The App market's six categories (Bots, Model arena, AI patent search, 3D studio…) did not
     exist. They are now Forge's real demand roots (`/r/generator`, `/converter`, …).
   - The footer's legal links now go to the real landing pages (`/terms`, `/privacy`, `/refund`,
     `/cookies`, `/faq`, `/contact`), plus status.
   - The detail page's hard-coded "稳定" stability column is removed. So is the
     "probe not wired" placeholder; the aside now shows the real input/output price.
   - The "模型实测 / Model Review" kicker claimed testing that never happened. It now reads "On the
     shelf" / "Available now".
4. **Supply internals on the public shelf.** The note is removed from `/` and `/models`; it belongs on
   the admin supply desk.
5. **390 layout.** The channel dock is `whitespace-nowrap` and scrolls horizontally. The utility bar
   hides the secondary links below `sm`.
6. **Type scale.** 210 arbitrary sizes now sit on `text-xs…4xl`. Small text in `neutral-8/9/10`
   (≈3.3–3.9:1 on white) moved to `muted-foreground` (4.75:1).
7. **Primitives and hover.**
   - The auth CTA and sign-out use `Button` (`ink` / `outline` / `link`).
   - The catalog filter uses `Input`; the empty result uses `EmptyState` with a clear action.
   - Range and top-up pills use `Button` with `aria-pressed`.
   - Dark-fill hovers go to `/90` instead of `neutral-11`.
   - The card lift is `-translate-y-px` with `motion-reduce`.
8. **Carousel.** Autoplay stops under `prefers-reduced-motion` and while focus is inside it
   (WCAG 2.2.2). All its labels are translated.

### Admin
1. Disabled "Customers" / "Trust" tabs with a "Ships in batch 2" tooltip were dead IA. They are removed.
2. The supply desk mixed Chinese into an English-only console. The sync button result had no
   status/alert role and no error colour. Both are fixed.
3. The tab row overflowed at 390 with no scroller; the header had fixed `px-6`. Both now scroll and pad
   responsively. The avatar's `title` is replaced by visible email · role from `md` and an `aria-label`.
4. `text-[11px]` ×8, `leading-[18px]` and `font-[450] tracking-[-0.02em]` moved onto the scale and
   `tracking-heading`. The arbitrary-typography allowlist dropped 7 admin entries.

### Status
1. Each of the 90 uptime cells carried a native `title` on top of the custom day card, so two tooltips
   stacked on hover. The `title` is removed; the card plus `aria-label` remain.
2. The component info icon was a `title` on a non-focusable span, hidden below `sm`. It is now a
   `Tooltip` on a ghost `Button`, reachable by keyboard and touch at every width.
3. `max-w-[760px]` ×4 → `max-w-3xl`.

### Forge (audit only, one fix)
- The docs curl sample pointed at `http://localhost:3105` and now uses the brand domain.
- Open: 209 CJK literals (most in China-specific runners, where they are domain content), 17 raw
  tables, 22 raw hex, 40 arbitrary sizes. The existing ratchets cover them.

## Shared-primitive issues (for routing)
- **`EmptyState` has two exports with different props.** `@nebutra/ui/layout` takes `variant`;
  `@nebutra/ui/primitives` rejects it at the type level. Pick one surface.
- **Router has no dark mode, and the shell cannot get one cheaply.** `styles/market-shell.css`
  pins `#f5f6fa` / `#f7f8fb` / `#fff` and off-ramp rgba shadows. It needs a `ThemeProvider` plus
  shell tokens (`--rm-canvas` from `--background`, shadows from the ramp). App-local, but it is a
  product decision.

## Left open
- Router dark mode (above). Router `brand-marks.tsx` SVG hex (vendor art, deliberate).
- Router zh-Hant brand blurbs reuse the Simplified text.
- The other 31 locales fall back to English for every new key.
- Admin `title` on fleet/staff time cells (3 left in the allowlist): a `Tooltip` there needs a
  client boundary per cell.
- Forge, as listed above.
