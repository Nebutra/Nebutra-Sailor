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

## 4. External DS / Refero swap (acceptance test)

1. Create a skin map: external primary/surface/border → our semantic table (`skins/README.md`).
2. Apply values only in theme JSON (or a single override CSS after tokens).
3. Restart app — **no** edits to Button/Input call sites.

If a surface still looks “stuck”, it is a **hard-coupling bug** (file still uses VI hex or raw palette step). Fix the component to semantic; do not fork colors in the app.

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

**Swap confidence:** changing semantic values in design-tokens theme JSON recolors product CTAs, surfaces, and text across web, landing, auth, idp, forge, router, docs shells without per-callsite edits.
