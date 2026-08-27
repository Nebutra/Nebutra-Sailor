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

## Simplified Chinese — self-hosted Noto Sans SC

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

That defines `--font-noto-sans-sc`. Nothing else is needed: the token stacks in
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
font-family: var(--font-geist-sans), "Geist", var(--font-noto-sans-sc), "Noto Sans SC", …;
```

Geist comes **first** and keeps Latin and the numerals — its tabular figures and
tighter x-height are what dense dashboard tables need, and it is the locked UI
face. Noto Sans SC takes CJK. Both faces cover Latin, so the *order* is what
decides: reversed, Noto would take the Latin too, and its Latin is not as
good as Geist's for UI.

Belt and braces: the generated `@font-face` rules carry a `unicode-range` with
no Latin, no ASCII and no general-punctuation codepoints in it, so a Latin-only
page can never trigger a CJK download even if a stack somewhere is written the
wrong way round. Geist Mono remains the code face.

### Building the subsets

```bash
FONTTOOLS_PYTHON=/path/to/python \
  pnpm --filter @nebutra/fonts subset:cjk -- --force
```

Requires Python with `fontTools` and `brotli` (for `--flavor=woff2`).
The script downloads the OFL Noto Sans SC variable face, instances 400 / 500 /
600 / 700, then subsets. Outputs land in `generated/`. The committed woff2
files are the SIL OFL Noto Sans SC chinese-simplified faces used by
`next/font/local` so a clean clone does not need fontTools to render text.

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

A variable CJK font carries per-weight deltas for every glyph it keeps, so one
variable file costs more than the static weights a page actually uses. The
pipeline instances 400 / 500 / 600 / 700 and subsets each one.

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

`vendor/noto-sans-sc/OFL.txt` is committed. Full source TTFs are downloaded by
`subset:cjk` and gitignored. Do not commit unmodified CJK source faces.

## Third-party font attribution

本软件使用了 **Noto Sans SC** 字体。
This software uses the **Noto Sans SC** typeface.

Noto Sans SC is licensed under the SIL Open Font License 1.1
(`vendor/noto-sans-sc/OFL.txt`). That licence is separate from this package's
MIT licence, which applies to first-party code only. Generated `.woff2` files
stay in the workspace for first-party apps and are excluded from the npm
tarball. See `NOTICE-FONTS.md`.

## Registered Families

The registry includes Geist, Inter, Space Grotesk, Playfair Display, JetBrains
Mono, Manrope, Sora, Work Sans, DM Sans, Plus Jakarta Sans, Outfit, Figtree,
Montserrat, Lexend, Fira Code, Roboto Mono, and Source Code Pro.

## Runtime Model

`next/font` downloads and self-hosts Google fonts at build time. At runtime,
the browser requests fonts from the application origin only when an element
uses the corresponding CSS variable.

## License

MIT for first-party code. Noto Sans SC binaries are SIL OFL 1.1 and are not
published to npm.
