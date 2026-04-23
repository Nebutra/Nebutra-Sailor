# AGENTS.md — apps/storybook

Scoped execution contract for the Storybook app.

## Scope

This app owns the Storybook runtime, addon configuration, and local demo stories
used to document shared UI behavior.

It owns:

- Storybook runtime config under `.storybook/`
- local docs and demo stories under `src/stories/`
- app-level build output configuration for Chromatic and static exports

It does not own the canonical component implementations in `packages/ui`.

## Source Of Truth

Use these files as the canonical source before editing behavior:

- `package.json` for runtime and validation commands
- `.storybook/main.ts` for story discovery and framework configuration
- `.storybook/preview.ts` and `.storybook/a11y-config.ts` for preview decorators
  and accessibility behavior
- `src/stories/` for app-local docs and showcase stories
- `packages/ui/src/**/*.stories.*` for component-co-located shared UI stories

Do not treat `dist/` or `.turbo/` logs as implementation truth.

## Contract Boundaries

- Keep Storybook runtime and addon setup in `.storybook/`; do not bury framework
  configuration inside stories.
- Shared component behavior belongs in `packages/ui`; this app should only host
  the Storybook surface and app-local showcase stories.
- If a story documents a shared component contract, prefer updating the
  co-located story in `packages/ui` rather than creating a divergent local copy.

## Generated And Derived Files

Treat these as derived artifacts:

- `dist/`
- `.turbo/`
- `node_modules/`

If the rendered Storybook output is wrong, update the checked-in story or
Storybook config instead of editing static build artifacts.

## Validation

Run the smallest credible validation after changes:

- `pnpm --filter @nebutra/storybook typecheck`
- `pnpm --filter @nebutra/storybook build`
