# AGENTS.md — packages/design/theme

## Scope

`@nebutra/theme` is the **design-language switch surface**.

## Do not reintroduce

- Multi-mood oklch `[data-theme]` catalogs (deleted 2026.07)
- Root `@theme { --color-primary: … }` dual-truth against `@nebutra/tokens`
- “Theme = recolor primary only” product thinking

## Source Of Truth

| Concern | Source |
|---------|--------|
| Product chrome (factory) | `@nebutra/tokens` |
| Design language catalog | `src/languages.json` |
| Brand Package fixtures | `packages/design/tokens/brands/*` |
| Multi-language CSS | `skins.css` (`html[data-brand]`) |
| Keyframes only | `themes.css` |

## Validation

```bash
pnpm --filter @nebutra/theme test
pnpm --filter @nebutra/theme sync:skins
```
