# @nebutra/docs-shared

Byte-identical component SSOT for `apps/design-docs` and `apps/sailor-docs`.

## Rule

- Edit files **here**, not under either app's `src/components`.
- Apps re-export via thin shims under `src/components/**` so existing relative imports keep working.
- Only files that were identical in both apps are owned by this package.

## Add a new shared component

1. Put the source under `src/components/...`
2. Add re-export shims in **both** apps (or run the re-export generator in this package's scripts later).
