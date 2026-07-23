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
import { applyLanguage, clearLanguage, LANGUAGE_REGISTRY } from "@nebutra/theme";
import vanta from "@nebutra/tokens/brands/vanta/brand.json";

applyLanguage("vanta", { package: vanta, persist: true });
clearLanguage(); // factory
```

```bash
nebutra theme list
nebutra theme inspect vanta
```

## Catalog

| id | Proves |
|----|--------|
| factory | Default tokens SSOT |
| linear | Chromatic solid CTA (dark) |
| gsap | gradient-stroke / outline + zones |
| raycast | action ≠ brand-mark + elev=key |
| vercel | Light mono + elev=hairline |
| vanta | Chromatic action≠brand + elev=none + pills |
| stripe | Indigo action ≠ midnight brand + elev=none + 4px |
| notion | Blue action ≠ ink brand + paper canvas + 8/12 radii |

## `themes.css`

Keyframes only. No color moods. Product colors never live here.
