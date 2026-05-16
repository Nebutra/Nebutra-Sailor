# `@nebutra/theme` — Design Spec

> Multi-theme engine of the Nebutra-Sailor design system.
> Part of the [root DESIGN.md](../../DESIGN.md). Spec format: `design-md@2026.05`.

| Field | Value |
|------|------|
| Package | `@nebutra/theme` |
| Status | Stable — 6 themes shipped, more allowed via governance |
| Source files | `packages/design/theme/src/registry.json` and generated `packages/design/theme/themes.css` |
| Activation | `[data-theme="…"]` attribute on `<html>` |
| Default theme | `neon` (no `data-theme` attribute) |

---

## 1. Identity

A **product feature**: the SaaS preset system (`@nebutra/preset`) lets end customers and self-hosters choose a theme that matches their product mood. Switching is CSS-only (no JS rebuild) — token values are overridden per `[data-theme]` selector.

**Boundary**: this package is for the multi-theme product feature. For light/dark of the *base* `neon` look, use `class="dark"` from `next-themes`. The two systems compose.

The theme catalogue is governed through `src/registry.json`. Consumers must import from
`@nebutra/theme/registry` instead of copying theme names. The Style Dictionary pipeline,
`@nebutra/preset`, CLI commands, docs, and future Figma/playground publishing all use this registry.

---

## 2. Tokens (per theme)

Each preset overrides the same set of tokens; only values differ. The base set:

```
Brand:        --color-primary, --color-secondary, --color-accent (+ -foreground each)
Surfaces:     --color-background, --color-foreground, --color-card, --color-popover, --color-muted, --color-border, --color-input, --color-ring
Status:       --color-destructive, --color-success, --color-warning, --color-info (+ -foreground each)
Derived:      --color-primary-hover, --color-primary-active (via color-mix in oklch)
Radius:       --radius-{sm,md,lg,xl,full}
Typography:   --font-sans, --font-mono, --font-heading
Shadows:      --shadow-{sm,md,lg,xl}
Transitions:  --transition-{fast,normal,slow}
```

All color values are **oklch** for perceptual uniformity. Hover/active states are derived via `color-mix(in oklch, …)` — no JS.

### 2.1 Theme catalogue

| `data-theme` | Mood | Background | Primary | Use case |
|------|------|-----------|---------|----------|
| `neon` *(default)* | Vibrant dark, electric blue | `oklch(0.141 0.005 285.9)` ≈ #09090b | `oklch(0.452 0.313 264.1)` ≈ vivid blue | AI SaaS dashboards |
| `gradient` | Soft light, blue spectrum | `oklch(1 0 0)` (white) | `oklch(0.546 0.245 262.9)` | Marketing / growth |
| `dark-dense` | High-density dark | near-black | desaturated blue | Pro tools, terminals |
| `minimal` | Neutral, low chroma | white / off-white | low-chroma blue | Document apps |
| `vibrant` | Saturated multicolor | white | vivid magenta-blue | Creator / consumer |
| `ocean` | Cool teal/blue | white | teal | B2B finance, infra |

> Exact oklch tuples for every theme are in `packages/design/theme/themes.css`. Designer-readable per-theme tables are deferred to Storybook (Foundation/Themes) — adding them here would duplicate the source of truth.

### 2.2 Default (neon) — illustrative

```css
@theme {
  --color-primary:        oklch(0.452 0.313 264.1);
  --color-secondary:      oklch(0.715 0.143 215.2);
  --color-accent:         oklch(0.714 0.203 264.1);
  --color-background:     oklch(0.141 0.005 285.9);
  --color-foreground:     oklch(0.985 0 0);
  --color-card:           oklch(0.212 0.006 285.9);
  --color-border:         oklch(0.274 0.006 286);
  --color-destructive:    oklch(0.577 0.245 27.3);
  --color-success:        oklch(0.723 0.219 149.6);
  --color-warning:        oklch(0.769 0.189 70.1);
  --color-info:           oklch(0.623 0.214 259.1);

  --color-primary-hover:  color-mix(in oklch, oklch(0.452 0.313 264.1), white 15%);
  --color-primary-active: color-mix(in oklch, oklch(0.452 0.313 264.1), black 10%);

  --radius-md: 0.375rem;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 3. Patterns

### 3.1 Wiring up a Next.js app

```tsx
// apps/{app}/src/app/globals.css
@import "tailwindcss";
@import "@nebutra/tokens/styles.css";   /* base tokens */
@import "@nebutra/theme/themes.css";    /* multi-theme overrides */

// apps/{app}/src/app/layout.tsx
import { ThemeProvider } from "@nebutra/tokens";

<ThemeProvider attribute="data-theme" defaultTheme="neon" themes={["neon","gradient","dark-dense","minimal","vibrant","ocean"]}>
  {children}
</ThemeProvider>
```

### 3.2 Switching themes at runtime

```tsx
"use client";
import { useTheme } from "@nebutra/tokens";

function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      <option value="neon">Neon</option>
      <option value="gradient">Gradient</option>
      <option value="dark-dense">Dark Dense</option>
      <option value="minimal">Minimal</option>
      <option value="vibrant">Vibrant</option>
      <option value="ocean">Ocean</option>
    </select>
  );
}
```

### 3.3 Adding a new theme

1. Add the DTCG file under `packages/design/design-tokens/tokens/themes/my-theme.json`.
2. Add the registry entry to `packages/design/theme/src/registry.json`.
3. Provide every token defined in §2.
4. Run `pnpm --filter @nebutra/design-tokens build` to regenerate theme CSS.
5. Validate with theme tests, preset tests, and the CLI smoke checks.
6. Add the playground/Storybook visual entry before publishing the theme.
7. Open a PR; design-system maintainer reviews perceptual coherence, contrast, and component coverage.

---

## 4. Imports & Conventions

```css
@import "@nebutra/theme/themes.css";
```

Themes are CSS at runtime, but their catalogue metadata is exported from `@nebutra/theme/registry`.
Theme names are registry-derived; do not introduce new handwritten enums.

### Forbidden

```tsx
// ❌ Hardcoding theme-specific colors in components
<div className="bg-[#7C3AED]" />

// ❌ Skipping a token override when defining a new theme
[data-theme="my-theme"] { --color-primary: oklch(…); /* missing background, etc. */ }
```

---

## 5. Theming (composition with light/dark)

Light/dark and multi-theme are **orthogonal**:

| `class` (next-themes) | `data-theme` (preset) | Result |
|-----------------------|----------------------|--------|
| (none) | (none) | base tokens from `@nebutra/tokens`, light |
| `dark` | (none) | base tokens, dark variant |
| (none) | `gradient` | gradient theme overrides |
| `dark` | `dark-dense` | dark-dense theme overrides (dark by design) |

Themes that define their own background/foreground supersede the `.dark` overrides for those tokens — designers should pick one mode per theme intent.

---

## 6. Versioning & Governance

| Surface | Status |
|--------|--------|
| Default theme name (`neon`) | **Locked** |
| Token *names* listed in §2 | **Locked** — every theme must define all of them |
| Adding a new theme preset | Extensible — design-system maintainer review |
| Renaming an existing theme | **Forbidden** without a migration alias |
| Per-theme oklch values | Extensible — adjust freely with PR + visual diff |

### Governance scripts

```bash
pnpm --filter @nebutra/theme test
pnpm --filter @nebutra/theme typecheck
pnpm --filter @nebutra/design-tokens build
pnpm --filter @nebutra/preset test
pnpm --filter nebutra build
node packages/ops/cli/dist/index.js theme list --format json
pnpm tsx scripts/validate-ui-governance-policy.ts
```

---

## 7. Open questions / review notes

- Per-theme oklch tables are not enumerated here to avoid duplicating `themes.css`. Storybook's Foundation/Themes panel is the canonical visual reference — add it if missing.

---

← back to [root DESIGN.md](../../DESIGN.md) ·
peer specs: [brand](../brand/DESIGN.md) · [tokens](../tokens/DESIGN.md) · [ui](../ui/DESIGN.md)
