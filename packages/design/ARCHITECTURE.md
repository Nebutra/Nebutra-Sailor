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
│  @nebutra/tokens   ★ product skin surface (runtime SSOT)    │
│  · Semantic: --primary, --background, --border, --radius…   │
│  · styles.css is what apps load (generated via tokens sync) │
│  · Brand Package engine: compile / emit / apply             │
│  · skins/<id>.css = single-skin publish path                │
└───────────────────────────▲─────────────────────────────────┘
                            │ palette refs / parity source
┌───────────────────────────┴─────────────────────────────────┐
│  @nebutra/brand + @nebutra/design-tokens                    │
│  · VI lock: 云毓蓝 #0033FE, 云毓青, logo assets               │
│  · DTCG JSON → Style Dictionary → verify:parity vs styles   │
│  · NOT for painting product chrome CTAs at call sites       │
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
| **Runtime CSS apps load** | `packages/design/tokens/styles.css` (**product SSOT**, generated) |
| DTCG authoring | `packages/design/design-tokens/tokens/*` → Style Dictionary → `styles.generated.css` |
| Parity contract | `verify:parity` must stay **100%**; then `tokens sync` copies generated → styles.css |
| **Design-language swap** | `brands/<id>/brand.json` + `@nebutra/theme` (`applyLanguage` / `data-brand`) |
| Dual light/dark skin | Optional `BrandPackage.modes.{light,dark}` — emit separate color blocks |
| Catalog copy (proves/description) | `packages/design/theme/src/languages.meta.json` |

> Multi-mood oklch `[data-theme]` catalog **deleted** (2026.07). Do not reintroduce root color dual-truth.

After DTCG edits:

```bash
pnpm --filter @nebutra/design-tokens build
pnpm --filter @nebutra/design-tokens verify:parity   # 100% required
pnpm --filter @nebutra/tokens sync                   # styles.css ← generated
```

## 4. Brand Package — carrier contract (Create Center)

The design system is a **host** for third-party design languages, not a preset zoo.
Create Center fills a **Brand Package**; components only read CSS variables.

### Color roles (required)

| Role | CSS | Meaning |
|------|-----|---------|
| `action` / `actionForeground` | `--primary` | **Product CTA only** (Button default) |
| `brand` / `brandForeground` | `--brand-mark` | Logo/mark accent — **never** default CTA |
| `canvas` / `surface` | `--background` / `--card` | Surfaces |
| `quiet` / `muted` / `border` | secondary/muted/border | Quiet UI |

`semantic` (shadcn bridge) is **derived**: `primary ≡ action`. Do not map brand mark into primary.

### Recipe (required)

| Field | Meaning |
|-------|---------|
| `buttonDefault` | `solid` \| `outline` \| `gradient-stroke` |
| `radii.{button,card,badge,input,pill}` | Shape slots |
| `elevationTokens.{card,control,raised}` | **Free CSS** `box-shadow` (any key/hairline/none stack) |
| `badgeDefault` | may diverge from action (`muted` / `brand` / …) |
| `density` | compact / comfortable / spacious |

Elevation *presets* (`key`, `hairline`, …) are only shortcuts that expand into `elevationTokens`.

### Zones

`data-zone="product"` — app shell (no marketing display).  
`data-zone="marketing"` — hero / large type / decorative vars only.

### Fixtures (proof of contract, not the product)

| Language (`@nebutra/theme`) | Proves |
|----------------------------|--------|
| factory | tokens SSOT, no skin |
| linear | chromatic solid action |
| gsap | stroke CTA + taxonomy extensions |
| raycast | **action ≠ brand** (Mist CTA, Coral mark) + free key elev |
| vercel | light monochrome + free hairline elev |
| vanta | chromatic action≠brand + elev=none + full pills + dual fonts |
| stripe | chromatic indigo action ≠ midnight brand + elev=none + 4px whisper type |
| notion | single blue CTA ≠ ink brand + paper≠card + elev=none + decorative accents |

```
Refero / design-sync / Desktop DS export
  → compileReferoTokens() → BrandPackage
  → brands/<id>/brand.json + skins/<id>.css
  → languages.json entry + theme sync:skins → skins.css catalog
  → applyLanguage(id) | data-brand | @import single skin
  → components recolor without call-site edits
```

**`@nebutra/theme` positioning:** this *is* the global theme-swap product.  
Stress-testing external DS languages is how we extend the **carrier**, not how we
accumulate one-off skins forever.

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
