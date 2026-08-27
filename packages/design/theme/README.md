# @nebutra/theme

**Design-language catalog** for global product chrome swap (Create Center / multi-tenant SaaS).

## What this is

| Layer | Package | Role |
|-------|---------|------|
| Product SSOT | `@nebutra/tokens` | `styles.css` + `recipe.css` |
| **Language swap** | **`@nebutra/theme`** | Brand Packages + `applyLanguage` + `skins.css` |
| Components | `@nebutra/ui` | `--primary`, `--brand-mark`, `--elevation-*` |

A **design language** is a full Brand Package (roles + recipe + free elevation + zones + fonts).

> **Removed (2026.07):** 78 oklch “mood” presets under `[data-theme]`. They dual-wrote product chrome, looked generic, and fought the carrier model. Do not reintroduce them.

## Quick start

```css
@import "@nebutra/tokens/styles.css";
@import "@nebutra/tokens/recipe.css";
@import "@nebutra/theme/skins.css"; /* multi-language, scoped to html[data-brand] */
```

```ts
// Client-safe root (or `@nebutra/theme/client`)
import { applyLanguage, clearLanguage, LANGUAGE_REGISTRY } from "@nebutra/theme";

applyLanguage("vanta", { persist: true }); // built-in Brand Package
clearLanguage(); // factory

// Compile / Create Center tooling — not on package root:
// import { compileReferoTokens } from "@nebutra/tokens/brand-package";
// import { compileReferoTokens } from "@nebutra/theme/brand-package";
```

```bash
nebutra theme list
nebutra theme inspect vanta
```

## Catalog generation

| File | Role |
|------|------|
| `tokens/brands/<id>/brand.json` | Package SSOT (roles, recipe, zones) |
| `src/languages.meta.json` | Catalog copy: description + proves |
| `src/languages.json` | **Generated** by `pnpm sync:languages` |
| `src/built-in-packages.generated.ts` | **Generated** runtime map for `applyLanguage(id)` |
| `skins.css` | **Generated** by `pnpm sync:skins` |
| `keyframes.css` | Shared animations (prefer over deprecated `themes.css`) |

```bash
pnpm --filter @nebutra/theme sync:languages
pnpm --filter @nebutra/tokens emit-skins
pnpm --filter @nebutra/theme sync:skins
```

## Catalog

| id | Proves |
|----|--------|
| factory | Default tokens SSOT |
| linear | Chromatic solid CTA + dual-mode dark/light |
| gsap | gradient-stroke / outline + zones |
| raycast | action ≠ brand-mark + elev=key |
| vercel | Light mono + elev=hairline + dual-mode palettes |
| vanta | Chromatic action≠brand + elev=none + pills |
| stripe | Indigo action ≠ midnight brand + elev=none + 4px |
| notion | Blue action ≠ ink brand + paper canvas + 8/12 radii |

## Dual-mode stress fixtures

Brand packages with `modes.light` + `modes.dark` (today: **linear**, **vercel**)
emit separate selector blocks so light paint never lands under bare `.dark`:

- light → `:root, html[data-brand="…"]`
- dark → `.dark, html.dark[data-brand="…"]`

Coverage: `src/__tests__/apply-language.test.ts` (runtime apply) and
`@nebutra/tokens` `emit-css.test.ts` (compiler). When adding a dual-mode
language, extend both fixtures.

## `keyframes.css`

Shared keyframe animations only. Prefer:

```css
@import "@nebutra/theme/keyframes.css";
```

`themes.css` remains a **deprecated alias** that re-exports keyframes (no color moods).
