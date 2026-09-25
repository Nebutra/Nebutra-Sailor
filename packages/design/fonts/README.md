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

## Brand faces — DM Sans (headings) and MiSans (Chinese)

Chosen 2026-09-25 by measuring what competitors ship: MiniMax and Moonshot set
Chinese in MiSans, DeepSeek and Databricks set Latin in DM Sans. Geist stays the
body/UI face for its tabular figures.

### Wiring an app

```tsx
import { cjkFontClassName } from "@nebutra/fonts/next/cjk";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

<html className={`${GeistSans.variable} ${GeistMono.variable} ${cjkFontClassName}`}>
```

`cjkFontClassName` defines `--font-dm-sans` (self-hosted variable subset, SIL
OFL). MiSans arrives through `<CjkFontFace />` from the same entry — render it
once in the root layout. It builds the `@font-face` rules at render time from
the committed keys and `publicAssetUrl()` (`NEXT_PUBLIC_R2_PUBLIC_URL`, then
`R2_PUBLIC_URL`, then the brand's `cdn` origin), so no host is hardcoded and a
scaffold resolves to its own CDN. The token stacks in `@nebutra/tokens` already
reference both. Non-Next hosts (Storybook) import `@nebutra/fonts/font-face` and
pass `origin` explicitly.

### Why MiSans is on the CDN, not in this package

The MiSans licence allows free commercial use and embedding **with attribution**,
but forbids distributing the font software on its own. This repository is public
and mirrored as a template, so committing the subsets would distribute them —
the reason vivo Sans was removed (b5e73db35). `pnpm subset:cjk --upload` writes
content-hashed subsets to the bucket behind your public asset origin
(`MISANS_R2_BUCKET`, under `fonts/misans/`) and commits only their keys. Until
they are uploaded, or offline, the requests fail and the stack falls back to
PingFang / YaHei. Credit MiSans on product surfaces (see NOTICE-FONTS.md).

### Stack order is the design decision

```css
font-family: var(--font-geist-sans), "Geist", var(--font-misans, "MiSans"), …;
```

The Latin face comes **first** and keeps Latin and the numerals; MiSans takes
CJK. Both cover Latin, so the order decides: reversed, MiSans would take the
Latin too.

Belt and braces: the generated `@font-face` rules carry a `unicode-range` with
no Latin, no ASCII and no general-punctuation codepoints in it, so a Latin-only
page can never trigger a CJK download even if a stack somewhere is written the
wrong way round. Geist Mono remains the code face.

### Building the subsets

```bash
FONTTOOLS_PYTHON=/path/to/python MISANS_ZIP=/path/to/MiSans.zip \
  pnpm --filter @nebutra/fonts subset:cjk -- --force --upload
```

Requires Python with `fontTools` and `brotli` (for `--flavor=woff2`) and a
logged-in `wrangler`. Without `MISANS_ZIP` the script downloads Xiaomi's official
package (`MISANS_ZIP_URL`). It subsets the static Regular / Medium / Semibold /
Bold faces, names each output by content hash, and with `--upload` puts them in
R2 (`MISANS_R2_BUCKET`) with an immutable cache header. Only `index.ts` (the
keys) and the manifest are committed; the woff2 files are gitignored. A hash change means a new URL, so
the CDN never serves a stale face. The bucket's CORS allowlist lives in
`infra/iac/cloudflare/r2/cors.json`: an app on a new origin gets no MiSans (the
stack silently falls back to PingFang) until its origin is added there.

### Why four weights

`--font-weight-heading` is 500 (`packages/design/tokens/recipe.css`), body is
400, and the token CSS writes literal 600 and 700 as well. Each static face
costs ~525 KB, and `unicode-range` plus per-weight `@font-face` means a page
only downloads the weights it renders.

### Why the static faces, not the variable one

A variable CJK font carries per-weight deltas for every glyph it keeps, so one
variable file costs more than the static weights a page actually uses.

### Character set

Three inputs, unioned — 4,330 characters in the current build:

1. **The zh catalogs, by glob** (1,662 chars) — every `zh*.json` under any
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

### Vendored sources

`vendor/misans/LICENSE.txt` (licence text and the FAQ answers on embedding) and
`vendor/dm-sans/OFL.txt` are committed. The MiSans zip and TTFs are gitignored.
Never commit a MiSans binary: the licence forbids distributing it on its own.

## Third-party font attribution

本产品使用了小米 **MiSans** 字体。
This product uses the **MiSans** typeface by Xiaomi.

MiSans is free for commercial use under the MiSans Font Intellectual Property
License Agreement, which requires this attribution
(`vendor/misans/LICENSE.txt`). DM Sans is SIL OFL 1.1 (`vendor/dm-sans/OFL.txt`).
Both licences are separate from this package's MIT licence. See
`NOTICE-FONTS.md`.

## Registered Families

The registry includes Geist, Inter, Space Grotesk, Playfair Display, JetBrains
Mono, Manrope, Sora, Work Sans, DM Sans, Plus Jakarta Sans, Outfit, Figtree,
Montserrat, Lexend, Fira Code, Roboto Mono, and Source Code Pro.

## Runtime Model

`next/font` downloads and self-hosts Google fonts at build time. At runtime,
the browser requests fonts from the application origin only when an element
uses the corresponding CSS variable.

## License

MIT for first-party code. DM Sans is SIL OFL 1.1. MiSans binaries are never
committed or published to npm; they are served from the deployment's asset CDN.
