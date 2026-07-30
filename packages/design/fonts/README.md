# @nebutra/fonts

Status: **WIP** — not yet published to npm.

The Simplified-Chinese face is wired into every Next app that loads Geist (web,
landing, design-docs, sailor-docs, admin, forge, router, sleptons, typelens,
mail-preview). The theme / DESIGN.md registry (the ~16 Google faces) is still used
only by `apps/web`.

Self-hosted fonts for Nebutra: the CJK body face, plus an OSS font registry for
themes and imported DESIGN.md font families.

The package has three entries:

- `@nebutra/fonts` is client-safe and maps a CSS font-family stack to the
  registry CSS variable that should be prepended.
- `@nebutra/fonts/next/cjk` is server-only and declares the self-hosted
  Simplified-Chinese face via `next/font/local` — no network at build time, which
  also keeps it working in a network-sandboxed dev server. **This is the one every
  app needs.**
- `@nebutra/fonts/next` is server-only and declares the build-time
  `next/font/google` registry faces plus the combined registry class name. It
  re-exports the CJK face, but importing it just for that would drag ~16 Google
  font downloads into the app — use `./next/cjk`.

## Installation

```bash
pnpm add @nebutra/fonts
```

## Usage

Apply registry font variables at the application root:

```tsx
import { fontRegistryClassName } from "@nebutra/fonts/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontRegistryClassName}>
      <body>{children}</body>
    </html>
  );
}
```

Resolve theme or DESIGN.md stacks on the client-safe path:

```ts
import { withRegistryFont } from "@nebutra/fonts";

const stack = withRegistryFont("Space Grotesk, sans-serif");
// "var(--font-space-grotesk), Space Grotesk, sans-serif"
```

## Simplified Chinese — self-hosted vivo Sans SC

Geist has no CJK coverage at all, so without a CJK face every Chinese character
falls back to whatever the OS supplies: PingFang on macOS, Microsoft YaHei on
Windows, something else again on Android. Chinese copy is a first-class surface
in this product (see `docs/microcopy/`), so the CJK face is self-hosted and
subset here.

### Wiring an app

Two lines in the root layout, beside the Geist loaders:

```tsx
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

<html className={`${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName}`}>
```

That defines `--font-vivo-sans-sc`. Nothing else is needed: the token stacks in
`@nebutra/tokens` (`--font-sans`, `--font-cn`, `--font-display`, `--font-heading`)
already reference the variable in the right position. The app also needs
`"@nebutra/fonts"` in `dependencies` and in `transpilePackages` (the package ships
TypeScript source).

Do **not** re-declare `--font-sans` and friends downstream. `@nebutra/ui`'s
`typography/fonts.css` used to, and being the later import its Geist-only copies
won, so the CJK half of the token stack never reached `--font-sans` at all. That
duplication is gone; the file now only carries derived aliases.

### Stack order is the design decision

```css
font-family: var(--font-geist-sans), "Geist", var(--font-vivo-sans-sc), "Noto Sans SC", …;
```

Geist comes **first** and keeps Latin and the numerals — its tabular figures and
tighter x-height are what dense dashboard tables need, and it is the locked UI
face. vivo Sans SC takes CJK. Both faces cover Latin, so the *order* is what
decides: reversed, vivo Sans would take the Latin too, and its Latin is not as
good as Geist's for UI.

Belt and braces: the generated `@font-face` rules carry a `unicode-range` with
no Latin, no ASCII and no general-punctuation codepoints in it, so a Latin-only
page can never trigger a CJK download even if a stack somewhere is written the
wrong way round. Geist Mono remains the code face.

### Verified, not assumed

Measured in Chromium against a running app (`apps/typelens`, dev and production
build), reading the fonts the engine actually used per text run via
`CSS.getPlatformFontsForNode` — not by eye and not from the declared stack:

| Probe | Face actually used |
|---|---|
| `Handgloves ABC` | Geist |
| `1234567890` | Geist |
| `开始设置的一二三` @400 | vivo Sans |
| `开始设置的一二三` @500 | vivo Sans Medium |
| `开始设置的一二三` @600 | vivo Sans Demibold |
| `开始设置的一二三` @700 | vivo Sans Demibold (no synthesis — `font-synthesis: none`) |
| `。、！？（）` | vivo Sans |
| `Nebutra 云毓 2026` | Geist for Latin + digits, vivo Sans for 云, PingFang SC for 毓 |

The last row is the design working as intended: 毓 is a GB2312 **level-2**
character, outside the subset, so it falls through the stack instead of bloating
every page. A Latin-only route (`/this-route-does-not-exist`) requested
`Geist_Variable` and **nothing else** — zero CJK bytes. The production build emits
exactly three woff2 files (498,084 / 504,228 / 504,332 B, byte-identical to the
package) and preloads only the two Geist files.

Note that `document.fonts.check("16px vivoSansCn", "A")` returns `true`. That is
the vacuous-true case in the spec — no face in the family matches U+0041's
`unicode-range`, so "all matching faces are loaded" is trivially satisfied. It is
not evidence of Latin coverage; the platform-font table above is.

### Building the subsets

```bash
pnpm --filter @nebutra/fonts subset:cjk          # idempotent; reports every byte size
pnpm --filter @nebutra/fonts subset:cjk -- --force
```

Requires `python3` with `fontTools` and `brotli` (for `--flavor=woff2`).
`woff2_compress` is not needed. Outputs land in `generated/`:

| File | Weight | Size |
|---|---|---|
| `vivo-sans-sc-400.woff2` | 400 body | 498,084 B (486.4 KB) |
| `vivo-sans-sc-500.woff2` | 500 `--font-weight-medium` | 504,228 B (492.4 KB) |
| `vivo-sans-sc-600.woff2` | 600 `--font-weight-heading` | 504,332 B (492.5 KB) |
| `vivo-sans-cn.css` | `@font-face` rules | 1,813 B |
| `generated/index.ts` | face metadata for `next/font/local` | 1,398 B |

Sizes move by a few hundred bytes as Chinese copy lands — the catalog character
count is an input, not a constant. `generated/subset-manifest.json` records the
exact character count and byte size of the build actually on disk.

### Why three weights

The design system's numeric slots are `--font-weight-medium: 500` and
`--font-weight-heading: 600` (`packages/design/tokens/recipe.css`), and the token
CSS writes literal `font-weight` in only four values: 500 (43×), 600 (35×),
400 (27×), 700 (10×). So 400 / 500 / 600 ship. 700 resolves to the 600 face by
normal CSS font matching, and because that matched face is itself ≥ 600 no
browser applies synthetic bold — which is precisely why the third face is
DemiBold 600 rather than Bold 700. Choosing 700 instead would leave the *default*
heading weight, the most common heading value in the system, a step out of place.
Skin-declared fractional weights (300 / 450 / 510) resolve into the same set.
Each weight costs ~490 KB, so shipping all nine static faces would be ~4.4 MB.

### Why the static faces, not the variable one

`vivoSansSCVF.ttf` is 42 MB. Subset to this exact character set it is still
1,070,240 B, because a variable CJK font carries per-weight deltas for every
glyph it keeps — one variable file costs more than all three static subsets on
the pages that only use one weight. `vivo Sans SC L3` is *not* usable as a body
face: 60,339 characters but zero in the CJK basic block, it is a rare-plane
supplement.

### Character set

Three inputs, unioned — 4,282 characters in the current build:

1. **The zh catalogs, by glob** (1,586 chars) — every `zh*.json` under any
   `messages/` or `locales/` directory, walked at build time, so new Chinese copy
   is covered on the next run instead of drifting away from a hardcoded list.
2. **CJK punctuation and fullwidth forms, wholesale** (197 chars) — U+3000–303F,
   U+FE30–FE4F, U+FF01–FF5E, U+FFE0–FFE6. Chinese text whose `、。！？（）` are set
   in a different face than its characters looks broken immediately: different
   baseline, different advance width. 35 of these are absent from the source face
   (`〄〰〸￦` and friends); the build reports them and they fall through the stack.
3. **A floor of common characters: GB2312 level-1** (3,755 chars, 一级汉字). The
   catalogs only cover *our* copy — product surfaces render *user* data, and one
   character of a name or a city falling back to PingFang mid-sentence is worse
   than not using the font at all. The conventional floor is the 通用规范汉字表
   一级字表 (3,500 常用字); GB2312 level-1 is a superset of essentially that set
   and, the deciding factor, is derivable in-process from the platform's own
   GB2312 decoder — no 3,500-entry list to vendor, review or let rot. It covers
   >99.5% of running modern text. Level 2 (~3,000 further rare surname and
   place-name glyphs) is excluded: it would roughly double every file for
   characters that appear in a fraction of a percent of text, which is exactly
   what OS fallback is for.

The floor is what costs the bytes: the catalog set alone subsets to 191,108 B per
weight, the full set to ~498,000 B.

> Possible follow-up, measured but **not** implemented here: splitting each
> weight into a hot tier (catalogs + punctuation, 1,777 chars, 197,028 B) and an
> extended tier (the GB2312 remainder, 2,509 chars, 312,644 B) with complementary
> `unicode-range`s would drop the common path from ~1.47 MB to ~591 KB across
> three weights, and only fetch the extended tier when user data actually renders
> a character outside our own copy. It costs two files per weight and (on the
> `next/font/local` path) a per-tier `declarations` entry to carry the range.

### Vendored sources

`vendor/vivo-sans/` holds only the three static TTFs the pipeline consumes —
`vivoSans-Regular.ttf`, `vivoSans-Medium.ttf`, `vivoSans-DemiBold.ttf` (7.4 MB
each) — not all 33 faces from the licensed set, and not the 42 MB variable font.
The licence agreement is committed beside them as
`vendor/vivo-sans/LICENCE-vivo-Sans.txt`. `VIVO_SANS_SOURCE_DIR` points the
script at the licensed originals when re-vendoring.

## Third-party font attribution

本软件使用了 **vivo Sans** 字体。
This software uses the **vivo Sans** typeface.

Per clause 2.1 of the vivo Sans 字体知识产权许可协议 (committed at
`vendor/vivo-sans/LICENCE-vivo-Sans.txt`): 您应在软件中特别注明使用了 vivo Sans 字体.
vivo Sans is licensed from vivo Mobile Communication Co., Ltd. and is **not**
covered by this package's MIT licence, which applies to the code only. Any
redistribution of the generated `.woff2` files carries the same obligation.

## Registered Families

The registry includes Geist, Inter, Space Grotesk, Playfair Display, JetBrains
Mono, Manrope, Sora, Work Sans, DM Sans, Plus Jakarta Sans, Outfit, Figtree,
Montserrat, Lexend, Fira Code, Roboto Mono, and Source Code Pro.

## Runtime Model

`next/font` downloads and self-hosts Google fonts at build time. At runtime,
the browser requests fonts from the application origin only when an element
uses the corresponding CSS variable.

## License

MIT
