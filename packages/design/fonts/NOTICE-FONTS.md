# Font redistribution notice

This package's MIT licence covers **first-party code only**.

## MiSans

本软件使用了 **MiSans** 字体（小米科技有限责任公司）。
This software uses the **MiSans** typeface by Xiaomi.

MiSans is free for commercial use and may be embedded in software on the
condition that the software states it uses MiSans (this notice, and the credit
line on the product surfaces). The font may not be distributed on its own or
have its appearance altered. Licence text: `vendor/misans/LICENSE.txt`.

## DM Sans

This software uses the **DM Sans** typeface, licensed under the SIL Open Font
License 1.1. Licence text: `vendor/dm-sans/OFL.txt`.

## Distribution

The DM Sans subset (`generated/dm-sans.woff2`) is committed so
`next/font/local` can load it offline; it is **not** in the npm `files` list.
MiSans subsets are never committed at all: the licence forbids distributing
the font on its own, so they are uploaded to the deployment's asset CDN and
`<CjkFontFace />` points at them. Do not add `generated/*.woff2` or other font
binaries to a publishable `files` glob.
