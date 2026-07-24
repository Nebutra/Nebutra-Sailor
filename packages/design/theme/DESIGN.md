# `@nebutra/theme` — Design Spec

> Design-language catalog for **global product chrome swap**.  
> Part of the [root DESIGN.md](../../DESIGN.md). Spec format: `design-md@2026.07`.

| Field | Value |
|------|------|
| Package | `@nebutra/theme` |
| Status | Design languages only — oklch multi-mood catalog **deleted** |
| Primary catalog | `src/languages.json` + generated `skins.css` |
| Brand Package fixtures | `packages/design/tokens/brands/*` |
| keyframes.css | Keyframes only (no color moods); themes.css is a deprecated alias |
| Product SSOT | Always `@nebutra/tokens` |

---

## 1. Identity

**What users mean by “换主题” in Create Center** is swapping a full **design language**:  
action vs brand-mark, button recipe, free elevation stacks, radii slots, type zones — not recoloring `--primary` alone.

That product surface lives here. The stress-test loop (Linear → GSAP → Raycast → Vercel → Vanta) is how we grow **carrier capacity**, not an infinite preset zoo.

**Not this package:** factory semantic HSL (tokens), VI logo lock (brand), component class strings (ui).

### 1.1 Single catalog

| Catalog | Attribute | Payload |
|---------|-----------|---------|
| **Design language** | `html[data-brand]` | Brand Package CSS |

Oklch multi-mood `[data-theme]` catalog was removed — dual-truth and weak design quality.

---

## 2. Design language contract

Each entry in `languages.json` maps to a Brand Package:

```
roles.action     → --primary          (CTA)
roles.brand      → --brand-mark       (logo / AI badge)
recipe           → --btn-default-*, --badge-default-*, radii
elevationTokens  → --elevation-card|control|raised  (free CSS)
zones            → product vs marketing type scales
typography.faces → @font-face
```

### 2.1 Fixture matrix (acceptance bar)

| id | Proves |
|----|--------|
| factory | No override — tokens SSOT |
| linear | Chromatic solid CTA + **dual-mode** dark/light |
| gsap | Non-solid CTA recipe + zones |
| raycast | action ≠ brand-mark + elev=key |
| vercel | Light mono + elev=hairline + **dual-mode** light/dark palettes |
| vanta | Chromatic action≠brand + elev=none + pills + dual fonts |

### 2.2 CSS modes

| Emit mode | Selector | Use |
|-----------|----------|-----|
| `global` (darkDefault) | `:root, .dark, html[data-brand]` | Dark-first single-skin demos |
| `global` (light) | `:root, html[data-brand]` | Light packs — never bind `.dark` |
| `scoped` | `html[data-brand]` only | `skins.css` multi-language catalog |

---

## 3. Patterns

### 3.1 App wiring

```css
@import "@nebutra/tokens/styles.css";
@import "@nebutra/tokens/recipe.css";
@import "@nebutra/theme/skins.css"; /* optional catalog */
```

```ts
import { applyLanguage, clearLanguage } from "@nebutra/theme";

applyLanguage("vanta", { persist: true }); // built-in Brand Package
clearLanguage(); // factory
```

### 3.2 Compile pipeline

```bash
pnpm --filter @nebutra/tokens compile-brand -- ~/Desktop/Design-System/Foo --id foo
# edit languages.json
pnpm --filter @nebutra/theme sync:skins
```

### 3.3 Light/dark

Independent of design-language **id**. Use `@nebutra/tokens` ThemeProvider (`class="dark"`).

| Pack shape | Emit behavior |
|------------|----------------|
| Single-mode (most fixtures) | One palette; `darkDefault` may bind `.dark` so dark shells keep the skin |
| Dual-mode (`modes.light` + `modes.dark`) | Light under `:root` / `html[data-brand]`; dark under `.dark` / `html.dark[data-brand]` (e.g. **vercel**) |

Recipe, typography, and zones are shared across modes; only color roles/semantic flip.

---

## 4. Anti-goals

- Do not treat 78 oklch moods as the product roadmap.
- Do not dual-write root `@theme --color-primary` against tokens.
- Do not map brand-mark into `--primary` for “branded buttons”.
- Do not add a language that only changes hue without a new **capacity** proof.

---

## 5. Validation

```bash
pnpm --filter @nebutra/theme test
pnpm --filter @nebutra/tokens test
nebutra theme list
nebutra theme inspect vanta
```
