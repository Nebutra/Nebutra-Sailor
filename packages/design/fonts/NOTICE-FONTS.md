# Font redistribution notice

This package's MIT licence covers **first-party code only**.

## MiSans

本软件使用了 **MiSans** 字体（小米科技有限责任公司）。
This software uses the **MiSans** typeface by Xiaomi.

MiSans is free for commercial use and may be embedded in software on the
condition that the software states it uses MiSans (this notice, and the
landing site's /credits page, which every public footer links to). The font may not be distributed on its own or
have its appearance altered. Licence text: `vendor/misans/LICENSE.txt`.

## DM Sans

This software uses the **DM Sans** typeface, licensed under the SIL Open Font
License 1.1. Licence text: `vendor/dm-sans/OFL.txt`.

## Theme / DESIGN.md registry faces

`src/next.ts` loads 19 faces from woff2 files vendored under
`generated/registry/`, sourced from `@fontsource-variable/*` npm packages
(Fontsource, version 5.3.0), each licensed under the **SIL Open Font License
1.1**, which permits use, embedding and redistribution, including bundling with
software: Inter, Inter Tight, Space Grotesk, Playfair Display, Source Serif 4,
Fraunces, JetBrains Mono, Manrope, Sora, Work Sans, DM Sans, Plus Jakarta Sans,
Outfit, Figtree, Montserrat, Lexend, Fira Code, Roboto Mono, Source Code Pro.
Each package carries its licence text (`LICENSE`) and copyright notice. The
`@fontsource-variable/*` packages are devDependencies only, used to vendor the
woff2 bytes at build time (`scripts/copy-registry-fonts.mjs`, wired into
`build` and `prepack`); they are not required at runtime by anything that
depends on `@nebutra/fonts`.

## Distribution

The DM Sans subset (`generated/dm-sans.woff2`) and the 19 registry faces
(`generated/registry/*.woff2`) are committed to git AND included in the npm
`files` list, so `next/font/local`'s package-relative `path` resolves the
same whether the package is a pnpm workspace symlink or a hoisted `npm
install` of the published tarball — the installing project's node_modules
layout no longer matters. MiSans subsets are the one exception: never
committed and never shipped, because the licence forbids distributing the
font on its own; they are uploaded to the deployment's asset CDN and
`<CjkFontFace />` points at them instead.
