# Font redistribution notice

This package's MIT licence covers **first-party code only**.

## vivo Sans

本软件使用了 **vivo Sans** 字体。
This software uses the **vivo Sans** typeface.

The licence is `vendor/vivo-sans/LICENCE-vivo-Sans.txt` (vivo Sans 字体知识产权许可协议).

Clause 2.1 requires attribution, which this NOTICE and the generated CSS fulfill.

Clause 2.3 forbids redistributing the font software or copies of it. Therefore:

- Generated `.woff2` / source `.ttf` files stay in this workspace for first-party apps.
- They are **not** included in the npm `files` list and must not be published.
- Downstream npm consumers do not receive vivo Sans binaries from this package.

Do not add `generated/*.woff2`, `vendor/vivo-sans/*.ttf`, or other font binaries to a publishable `files` glob.
