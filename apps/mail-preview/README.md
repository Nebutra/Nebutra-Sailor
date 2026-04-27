# mail-preview

Local preview/export harness for `@nebutra/email`.

This app is intentionally small. Email template content and sender contracts live
in `packages/email`; this workspace only validates the generated preview output
and builds a local preview index.

## Commands

```bash
pnpm --filter mail-preview check
pnpm --filter mail-preview export
```

`check` verifies that every template in `@nebutra/email` has a generated HTML
preview in `dist/`. `export` regenerates `dist/index.html` and
`dist/preview-manifest.json` from the package-owned template catalog.
