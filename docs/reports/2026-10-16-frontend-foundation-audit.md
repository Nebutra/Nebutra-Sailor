# Frontend foundation audit: typography and the base layer

- **Date**: 2026-10-16
- **Trigger**: owner verdict on the live UI, "丑爆了 感觉是前端工程基础设施的错误". The ugliness is systemic, and it starts in the font and base-style plumbing that every app wires for itself.
- **Scope**: every Next app (landing, web, auth, idp, router, admin, design, forge, para, sleptons, sailor-docs, mail-preview, typelens, kuanlan), Storybook, and the create-sailor template, which ships the same layouts.
- **Method**: computed styles and `document.fonts` after `fonts.ready` and network idle, plus every font response with its byte count. Captured with Playwright on `channel: "chrome"` at 1440×900, light, `en-US`. "Before" is production on 2026-10-16. "After" is local `next build && next start` of this change (web: `next dev` on the PGlite preview database, signed in as the seeded preview admin). Source audit read from `origin/main`.
- **Evidence**: `artifacts/type-foundation/` (git-ignored). `before-prod.json` and `after-local-*.json` hold the raw measurements, `before-prod-*.png` and `after-local-*-*.png` the captures, and `measure.mjs` is the script that produced them.

## 1. What production rendered (before)

| App (page) | body | h1 | h2 | h3 | font files | KB | faces declared | body features |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| auth (sign-in) | **ui-sans-serif** | **ui-sans-serif 600** | ui-sans-serif 600 | ui-sans-serif 600 | 1 (unused DM Sans) | 67 | 6 | calt, rlig |
| idp (sso) | **Times** | **Times 500** | – | – | 1 (unused) | 67 | 6 | calt, rlig |
| web (app, public root) | Geist | DM Sans **600** | DM Sans 600 | – | 3 | 204 | 43 | calt, rlig |
| router (home) | Geist | – | DM Sans **600** | – | 3 | 204 | 9 | **cv11, ss01** |
| design (home) | Geist | DM Sans **400** | Geist 500 | – | **8** | **413** | 47 | calt, rlig |
| forge (home) | Geist | DM Sans **600** | DM Sans 600 | – | 4 | 727 | 9 | cv11, ss01 |
| landing (nebutra.com) | Geist | DM Sans 500 | DM Sans 500 | DM Sans 500 | 5 (**DM Sans ×2**) | 763 | **67** | calt, rlig |
| status (landing app) | Geist | **"DM Sans"** 500 (second file) | same | same | 4 | 240 | 67 | calt, rlig |
| docs (nebutra.com/docs) | Geist | DM Sans **600** | DM Sans 600 | DM Sans 400 | 3 | 204 | 9 | calt, rlig |
| web /usage (signed in; local `origin/main`, PGlite) | Geist | DM Sans **600** | DM Sans 600 | DM Sans **400** | 3 | 204 | 51 | calt, rlig |

In every app, `html` font-size is 16px, `--radius` is 0.375rem, `--border` and `--background` come from the same tokens, and `--control-height-md` is 40px. The token layer agrees with itself. The apps disagree.

### Root causes, in order of damage

1. **Each layout composed its own loader string.** It took three imports (`geist/font/sans`, `geist/font/mono`, `@nebutra/fonts/next/cjk`) and four class names on `<html>`. auth and idp applied none of the classes; kuanlan used `next/font/google`. Counts per root layout on `origin/main`:

   | layout | Geist | Geist Mono | DM Sans class | MiSans face | registry | next/font/google |
   | --- | --- | --- | --- | --- | --- | --- |
   | auth, idp | **0** | **0** | **0** | 1 | 0 | 0 |
   | kuanlan | 0 | 0 | 1 | 1 | 0 | **1** |
   | web, landing, design | 1 | 1 | 1 | 1–2 | 1 | 0 |
   | admin, forge, para, router, sleptons, typelens, mail-preview, sailor-docs | 1 | 1 | 1 | 1–2 | 0 | 0 |

2. **The token stacks started with a `var()` that had no fallback.** One example is `--font-sans: var(--font-geist-sans), "Geist", …`. When the variable is undefined, CSS does not skip that entry. The whole `font-family` declaration becomes invalid at computed-value time, and the element falls back to the inherited face or the UA default. That is why `--font-sans` measured as an **empty string** on auth and idp. auth fell through to Tailwind preflight's `ui-sans-serif`; idp, whose body never reached preflight's stack, fell to **Times**. Every skin had the same shape (`var(--font-reg-inter)`, …).
3. **The heading rule could not win.** `static/base.css` set headings through `:where(h1…h6) { font-weight: var(--font-weight-heading) }`, which has zero specificity, inside `@layer base`. Tailwind preflight, earlier in the same layer, sets `h1…h6 { font-weight: inherit }` at 0,0,1, so the ramp weight never applied anywhere. Every heading without a weight class rendered at the body's 400 (the design h1). Every heading with one rendered at whatever the app typed. **244 weight utilities** sat on `<h1>`–`<h3>` across apps and `@nebutra/ui`: landing 163 call sites, web 124, @nebutra/ui 79, forge 17, router 15, auth 15. `@property --font-weight-heading` also registered `initial-value: 600`, and the `text-heading-*` utilities hardcoded 600 and 700.
4. **DM Sans was two faces.** The registry's own DM Sans (`--font-reg-dm-sans`) was a second copy of the brand heading face. The nebutra-site skin named it, so nebutra.com downloaded both files and set h1 in one and the status page's headings in the other.
5. **Design-language fonts loaded for every visitor.** The design home's language gallery painted each of nine miniatures in its own face, which put Inter, Inter Tight, Fraunces, Source Serif 4 and Roboto Mono on the network for every visit. Roboto Mono had a second trigger: Geist Mono's next/font fallback list names `"Roboto Mono"`, and the registry declared a face with that name and no `unicode-range`, so the ⌘ in every `<Kbd>` (a glyph Geist Mono lacks) downloaded it.
6. **KaTeX was imported in `globals.css`**, so its 22 `@font-face` rules shipped on every landing page. Only blog posts render math.
7. **Base-layer drift.** Smoothing, `text-rendering`, OpenType features and `::selection` were restated in six globals, each a little differently:

   | globals.css | via preset | smoothing restated | features | selection | body font |
   | --- | --- | --- | --- | --- | --- |
   | auth, sleptons | yes | yes | – | – | – |
   | forge, router | yes | yes | **cv11, ss01** | **primary 28%** | – |
   | web | no | yes (×5) | – | – | yes |
   | landing | no | yes | – | – | yes |
   | sailor-docs, kuanlan | no | – / yes | – | – | – / yes |

   Apps that imported `@nebutra/ui/typography/fonts.css` got `text-rendering: optimizeLegibility`, and landing and docs did not (`auto`). `cv11` does not exist in Geist: fontTools on Geist 1.7.0 lists `ss01`–`ss11`, `tnum`, `frac`, `case` and `dlig`, and no `cv**` (cv11 is an Inter feature). `calt` and `rlig`, the default list, are not in Geist either. fumadocs set its own heading weights (DocsTitle `font-semibold`, prose h2/h3 600).
8. **Shared components could not be hidden by a class.** This is the same family of fault, reported on 2026-10-16 (#772). An inline `display` on the element that carries the caller's `className` beats `hidden` / `dark:hidden`, so themed logo pairs showed both logos. `StarsCanvas` in `@nebutra/ui` had the same shape (`style={{ display: "block" }}`).

### Other foundation layers (measured, consistent, left alone)

- Canvas and border: `--background 210 20% 98%` and `--border 225 8% 90.2%` everywhere in light mode. The landing app runs the dark nebutra-site skin by design.
- Radius `0.375rem`, `--control-height-md` 40px and `html` 16px everywhere. The control heights that differ (auth and forge inputs 48px, design 40px, router pill input 48px/9999px) are component and app choices, not foundation drift.
- The shadow ramp (`shadow-ambient-*`, `shadow-glass-*`, `shadow-glow-*`) is registered on Tailwind's theme in every app through `@nebutra/tokens`.
- The focus ring was already one unlayered rule in `base.css` (`hsl(var(--ring))`, 2px, offset 2px).
- No scrollbar styling existed anywhere (`scrollbar-color: auto` in every app).

## 2. The fix: one pipeline

| Layer | Owner | What changed |
| --- | --- | --- |
| Faces (Next) | `@nebutra/tokens/fonts` | `fontClassName` (Geist, Geist Mono, DM Sans variables) and `<FontFaces />` (MiSans, CDN, CJK-only range, optional CSP `nonce`). Every root layout and not-found page uses exactly these two. |
| Faces (Vite / Storybook) | `@nebutra/tokens/fonts.css` | `@font-face` for Geist, Geist Mono and DM Sans from the same files (`scripts/copy-fonts.mjs`). `@nebutra/tokens/fonts/faces` provides MiSans. |
| Design-language faces | `@nebutra/tokens/fonts/registry` | Only web, landing, design and kuanlan import it. Every face is `preload:false` and now carries its Latin `unicode-range`, so a face downloads only while the active language's stack renders in it. DM Sans resolves to the brand face (the duplicate file is gone). |
| Stacks | `core.json:fontFamily` | Every loader `var()` carries its family as the fallback (`var(--font-geist-sans, "Geist")`), so a surface that misses the loader degrades to the family name, never to an invalid declaration. The emitter (`withRegistryFont` / `withNearestRegistryFont`) does the same for every skin. The hand-kept `@theme` mirror of the stacks in the Style Dictionary config is now generated from `core.json`. |
| Weights and features | `core.json:fontWeight`, `fontFeature` | New tokens: `--font-weight-heading: 500`, `--font-weight-body: 400`, `--font-features-sans: "ss01" 1`, `--font-features-heading: normal`, `--font-features-numeric: tabular-nums`. `@property --font-weight-heading` defaults to 500. `text-heading-*` utilities read the token. |
| Base sheet | `design-tokens/static/base.css` | Owns smoothing, `text-rendering`, `font-synthesis`, `text-size-adjust`, the body face (user font → `--font-sans` → CJK tail), Geist `ss01`, the heading rule (plain type selectors, so it beats preflight), balanced headings and pretty paragraphs, the code face, tabular numerals in tables, `::selection` in the House blue (`--ring`), `scrollbar-color`, and CJK tuning under `:lang(zh|ja|ko)`: `text-autospace`, strict line-break, 1.75 leading for running text, zero tracking on headings. The six app restatements are deleted, and `@nebutra/ui` `fonts.css` keeps only its aliases. |
| Heading weight | the ramp | The weight utilities on h1–h3 were removed from `@nebutra/ui` (79), landing, auth, design, forge, para, sleptons, typelens, admin, mail-preview, idp and the commerce packages: 386 tags in all. web and router were left alone because two craft passes are open on them, and their 140 remaining overrides sit on a shrink-only list. sailor-docs overrides fumadocs' heading weights with one unlayered rule. |
| Math | landing blog post route | `katex.min.css` is imported by `blog/[slug]/page.tsx` only. |
| Gallery | design site | A miniature paints its language's face only for the active language or a tile the visitor points at or focuses. |
| Hideability | `@nebutra/brand`, `@nebutra/ui` | `StarsCanvas` moves `display` into its class list. A render test hides every brand component and variant with `className="hidden"`, and an architecture test fails any shared element that carries the caller's `className` and sets `display` or `visibility` inline. |

Public APIs stay compatible. `@nebutra/fonts/next*` still exports what it did, minus the duplicate DM Sans face. `fontRegistryClassName` and `withRegistryFont` keep their signatures, and `cjkFontClassName` still exists.

## 3. After (local build of this change)

| App (page) | body | h1 | h2 | h3 | font files | KB | faces declared | body features |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| auth (sign-in) | **Geist** | **DM Sans 500** | DM Sans 500 | DM Sans 500 | 3 | 170 | 10 | ss01 |
| router (home) | Geist | DM Sans 500 | – | – | 3 | 204 | 9 | ss01 |
| design (home) | Geist | **DM Sans 500** | Geist 500 (own `font-sans`) | – | **3** | **204** | 45 | ss01 |
| landing (nebutra.com) | Geist | DM Sans 500 | DM Sans 500 | DM Sans 500 | **3** (one DM Sans) | 170 | **46** | ss01 |
| web (/usage, signed in) | Geist | **DM Sans 500** | DM Sans 600 (web allowlist) | **DM Sans 500** | 3 | 204 | 49 | ss01 |

- auth and landing were re-measured after rebasing onto #773, which split Geist Sans by script (35 KB preloaded Latin file) and stopped preloading Geist Mono. `@nebutra/tokens/fonts` now composes that split for every app: `geistSansClassName` and `geistMono` from `@nebutra/fonts/next/geist`. router, design and web were measured before the rebase, with the 69 KB single Geist file, and will drop by about 34 KB the same way. Landing's 763 KB "before" includes the 523 KB MiSans weight that production loads; locally, MiSans is blocked by CORS, so the comparable Latin figure is 240 KB (4 files, two of them DM Sans) before and 170 KB (3 files) after.
- The selection colour is the House blue at 22% in every app. It was primary ink at 20% in some apps and 28% in others.
- In the design gallery, hovering a language tile loads that one face (measured: 1 file). Nothing loads before the hover.
- MiSans requests fail on localhost (CORS allowlist), which is expected. Production serves them from the CDN as before.

### Captures

| Page | Before (production) | After (local build) |
| --- | --- | --- |
| auth sign-in | `artifacts/type-foundation/before-prod-auth.png` | `artifacts/type-foundation/after-local-auth-auth.png` |
| app usage | `before-local-web-usage.png` (origin/main, local dev, signed in) | `after-local-web-usage.png` |
| router home | `before-prod-router.png` | `after-local-router-router.png` |
| design home | `before-prod-design.png` | `after-local-design-design.png`, `after-design-gallery-hover.png` |
| nebutra.com | `before-prod-landing.png` | `after-local-landing-landing.png` |

## 4. Guards

- `scripts/lint-font-pipeline.mjs` runs in `pnpm lint` and is configured by `governance.config.json → fontPipeline`. It has four rules:
  - **loader**: no `next/font`, `geist/font`, `@nebutra/fonts/next*` or `@font-face` outside `packages/design/{tokens,fonts}`. Zero tolerance. Exempt: kcq, kcq-docs, pebble (independent products) and the typelens specimen catalog.
  - **root-layout**: every app file under `src/app` that renders `<html>` imports `@nebutra/tokens/fonts` and applies `fontClassName`.
  - **family-literal**: no typed font-family in apps. Shrink-only list: 1 file, the satori OG image.
  - **heading-weight**: no weight utility on h1–h3 in apps or `@nebutra/ui`. Shrink-only list: 88 files, 140 occurrences, all in web and router.
- `tests/architecture/lint-guards-actually-guard.test.ts` probes all four rules: each must fail on a real violation and pass without it.
- `tests/architecture/font-pipeline.test.ts` checks that:
  - each of the 14 app root layouts imports the shared module, puts `fontClassName` on `<html>` and renders `<FontFaces />`;
  - every new app root is governed or exempt;
  - Storybook takes the CSS path;
  - no loader `var()` in a shipped stack lacks a fallback;
  - heading weight has one source (`core.json` = `styles.css` = `@property` = every `text-heading-*`);
  - KaTeX stays route-scoped.
- `tests/architecture/class-hideable.test.ts` and `packages/design/brand/src/components/visibility.test.ts` cover hideability (§2, last row).

## 5. Left open

- The 140 heading-weight overrides in web and router. Each drops off the list when its file is next touched. They were left for the two open craft passes to avoid conflicts.
- Control-height choices per app (sign-in 48px inputs against the 40px ladder) are a design decision, not a foundation fault.
- The `text-heading-*` utilities still hand-set size, leading and tracking instead of reading `core.json:type`. Only one call site uses them.
