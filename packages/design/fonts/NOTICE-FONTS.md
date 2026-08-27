# Font redistribution notice

This package's MIT licence covers **first-party code only**.

## Noto Sans SC

本软件使用了 **Noto Sans SC** 字体。
This software uses the **Noto Sans SC** typeface.

Noto Sans SC is licensed under the SIL Open Font License 1.1. The licence
text is `vendor/noto-sans-sc/OFL.txt`.

Generated `.woff2` subsets stay in this workspace for first-party apps so
`next/font/local` can load them offline. They are **not** included in the npm
`files` list and must not be published. Downstream npm consumers do not receive
font binaries from this package.

Do not add `generated/*.woff2` or other font binaries to a publishable `files`
glob.
