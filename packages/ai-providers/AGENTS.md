# AGENTS.md — packages/ai-providers

Execution contract for Nebutra's AI provider metadata registry package.

## Scope

Applies to everything under `packages/ai-providers/`.

This package owns provider metadata only: supported provider registry entries,
categories, status flags, env-variable requirements, and scaffolding templates
consumed by docs and `create-sailor`. Runtime model execution lives in
`@nebutra/agents`, not here.

## Source Of Truth

- Public package surface and published files: `package.json`, `src/index.ts`
- Canonical provider registry, category taxonomy, and helper accessors:
  `src/meta.ts`
- Template source consumed by scaffolding and docs generators:
  `templates/registry.ts.template`

Treat `README.md` as descriptive only. If examples drift, update `src/meta.ts`
or the template instead of preserving stale docs.

## Contract Boundaries

- Keep this package meta-only. Do not move runtime SDK setup, model execution,
  or provider transport code into this package; that belongs in `@nebutra/agents`.
- Treat `src/meta.ts` as the canonical source for provider IDs, categories,
  statuses, env prefixes, and required env vars. Additive registry changes are
  safest; renames or removals are compatibility changes for CLI and docs flows.
- Keep `templates/registry.ts.template` aligned with the metadata model. If the
  scaffolded registry shape changes, update both the template and metadata
  contract deliberately.
- Preserve the separation between metadata and generated output. Consumers
  should derive UI, docs, and scaffold files from this package rather than
  hardcoding parallel provider lists elsewhere.

## Generated And Derived Files

- `dist/` is the published build output and is always derived from `src/`.
- Do not hand-edit emitted JS or declaration files.
- Template consumers generate their own artifacts; update `src/meta.ts` or
  `templates/registry.ts.template` rather than patching generated downstream
  registries directly.

## Validation

- Metadata-only changes:
  `pnpm --filter @nebutra/ai-providers typecheck`
- Registry template or export changes:
  `pnpm --filter @nebutra/ai-providers build`
