# Design System Architecture

> Ownership boundaries for tokens, UI, themes, and apps.  
> Goal: **swap a visual skin by editing one map** — not every call site.  
> Craft bar: same discipline as a GSAP timeline layer (one clock, clear zones).

## 1. Layers (strict)

```
┌─────────────────────────────────────────────────────────────┐
│  apps/*   product screens                                   │
│  · Import @nebutra/ui/styles/preset.css (or sources.css)    │
│  · Compose Button / Input / Card — never invent CTA colors  │
└───────────────────────────▲─────────────────────────────────┘
                            │ import components + one CSS entry
┌───────────────────────────┴─────────────────────────────────┐
│  @nebutra/ui                                                │
│  · CVA class strings on SEMANTIC tokens only                │
│  · styles/sources.css owns Tailwind @source (scan)          │
│  · styles/preset.css = tailwind + tokens + sources + fonts  │
└───────────────────────────▲─────────────────────────────────┘
                            │ hsl(var(--primary)) etc.
┌───────────────────────────┴─────────────────────────────────┐
│  @nebutra/tokens   ★ product skin surface                   │
│  · Semantic: --primary, --background, --border, --radius…   │
│  · Generated from design-tokens JSON (SSOT for values)      │
│  · skins/README.md = how to re-map for external DS          │
└───────────────────────────▲─────────────────────────────────┘
                            │ palette refs
┌───────────────────────────┴─────────────────────────────────┐
│  @nebutra/brand + design-tokens primitives                  │
│  · VI lock: 云毓蓝 #0033FE, 云毓青, logo assets               │
│  · NOT for painting product chrome CTAs                     │
└─────────────────────────────────────────────────────────────┘
```

### Product vs identity

| Zone | Tokens | Used by |
|------|--------|---------|
| **Product chrome** | `--primary`, `--background`, `--foreground`, `--muted`, `--border`, `--input`, `--ring`, status | Buttons, inputs, cards, nav, tool runners |
| **Brand identity** | `--brand-primary`, `--brand-accent`, `--brand-gradient-logo`, logo SVGs | Logo, wordmark, official brand marks |

`--brand-gradient` is a **legacy alias** of `hsl(var(--primary))` so old strings keep working while the skin stays single-sourced.

## 2. CSS entry contract (no per-app inventiveness)

| App type | Import |
|----------|--------|
| Simple product (forge, router, auth, idp, …) | `@import "@nebutra/ui/styles/preset.css";` |
| Complex (fumadocs, katex first) | tailwind + tokens + `@import "@nebutra/ui/styles/sources.css";` |

**Forbidden:** hand-rolled `@source "../../../../packages/design/ui/src"` in apps.  
Paths live only in `packages/design/ui/src/styles/sources.css`.

## 3. Token value SSOT

| Concern | Source of truth |
|---------|-----------------|
| Semantic HSL values (light/dark) | `packages/design/design-tokens/tokens/themes/{light,dark}.json` |
| Palette scales | `packages/design/design-tokens/tokens/core.json` |
| Runtime CSS apps load | `packages/design/tokens/styles.css` (generated) |
| Optional multi-mood SaaS themes | `@nebutra/theme` + `[data-theme]` (same *names*, different values) |

Rebuild after token JSON edits:

```bash
node packages/design/design-tokens/style-dictionary.config.mjs
node packages/design/tokens/scripts/sync-styles.mjs
```

## 4. Brand Package / Create Center swap (acceptance test)

Users (Create Center) apply a **Brand Package**, not a one-off hex edit:

```
Refero tokens.json + DESIGN.md
  → compileReferoTokens()  (@nebutra/tokens/brand-package)
  → brand.json + skin.css
  → @import skin  (semantic + --btn-default-* recipe)
  → Button / product chrome recolors & restyles without call-site edits
```

| Fixture | Recipe | Proves |
|---------|--------|--------|
| `skins/linear.css` | solid CTA + product/marketing zones | color + primary pair |
| `skins/gsap.css` | gradient-stroke, pill, Mori faces, 224px marketing | **recipe + fonts + zones** |

```css
@import "@nebutra/ui/styles/preset.css"; /* includes recipe.css */
@import "@nebutra/tokens/skins/gsap.css";
```

```html
<main data-zone="product">…app shell…</main>
<section data-zone="marketing">…hero / display…</section>
```

Compile / Create Center paths:

```bash
# Refero folder on disk
node packages/design/tokens/scripts/compile-brand.mjs ~/Desktop/GSAP --id gsap

# design-sync pull → Brand Package
design-sync brand --json --id gsap
```

```ts
import { useBrand, useBrandIframePreview, applyBrandPackage } from "@nebutra/tokens";
import { compileBrandFromTokenSets } from "@nebutra/design-sync";

// Host shell
const { apply } = useBrand({ autoRestore: true });

// Tenant iframe preview
const { iframeRef, apply: applyPreview, writePreviewDocument } = useBrandIframePreview({
  baseStylesheetHrefs: ["/preview-base.css"],
});
```

Default shipping brand = no skin import.  
If a surface stays stuck → hard-coupling (`bg-blue-9` / hex); fix call site to semantic.

### Product chrome recipe contract (governed)

| Concern | CSS vars / class | Components |
|---------|------------------|------------|
| Default CTA | `.btn-brand-default` + `--btn-default-*` | Button default |
| Default badge | `.badge-brand-default` + `--badge-default-*` | Badge default |
| Control height | `--control-height-{tiny,sm,md,lg}` | Button sizes |
| Type weight | `--font-weight-medium` | Button / badge |
| Card elevation | `--elevation-card` | Card, Material base |
| Control elevation | `--elevation-control` | Input, Select, Textarea, tabs |

`recipe.elevation: "none"` zeros elevation vars.  
**Out of scope (allowed hardcode):** VI logo colors, OAuth vendor marks, decorative/motion demos, trial/turbo gradients.

## 5. Motion note (GSAP-level craft, not CI theatre)

- **Product Motion:** `@nebutra/ui` shared motion primitives.
- **Landing storytelling GSAP:** only `apps/landing-page/src/shared/animation/gsap/*` (see animation governance).
- Same idea as tokens: **one ownership zone**, apps consume, they don’t re-implement the clock.

## 6. Anti-patterns

| Anti-pattern | Do instead |
|--------------|------------|
| `style={{ background: "#0033FE" }}` on product CTA | `bg-primary` / `Button` |
| App invents new blue for “this page” | Change `--primary` in the skin |
| Copy `@source` monorepo paths into every app | Import `@nebutra/ui/styles/*` |
| CI lint of globals as the main safety net | Package-owned CSS entry (this doc) |
| Using `--brand-primary` for form controls | Semantic `--primary` |


## 7. Full-site product chrome pass (status)

All product apps under `apps/*` consume:

1. Package CSS entry (`preset.css` or `sources.css`) for Tailwind scan
2. Semantic classes / `hsl(var(--primary|background|foreground|border|muted-…))` for product chrome

**Intentionally not converted** (identity / docs / demos):

- Token playgrounds & scale swatches that *display* `--neutral-N` names
- Generated export HTML fixtures (startup-os files)
- Storybook foundation stories that document VI hexes by name
- Hidden form inputs / test mocks using native HTML

**Swap confidence:** changing semantic values in design-tokens theme JSON **or** importing one file under `@nebutra/tokens/skins/*` recolors product CTAs, surfaces, and text that already use the semantic contract (Button / Input / `bg-primary` / …).

**How to verify residual hard-coupling (local, not CI):**

```bash
node scripts/check-product-chrome-coupling.mjs
```

Opt-in Linear diagnostic skin (does **not** replace default Nebutra brand):

```css
@import "@nebutra/tokens/skins/linear.css";
```
