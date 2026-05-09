# `@nebutra/tokens` — Design Spec

> Runtime token layer of the Nebutra-Sailor design system.
> Part of the [root DESIGN.md](../../DESIGN.md). Spec format: `design-md@2026.05`.

| Field | Value |
|------|------|
| Package | `@nebutra/tokens` |
| Status | **★ Source of truth for runtime apps** |
| Source file | `packages/tokens/styles.css` |
| Tailwind integration | Tailwind v4 `@theme inline` block in same file |
| Re-exports | `ThemeProvider`, `useTheme` from `next-themes` |

---

## 1. Identity

This package emits the **runtime CSS variables** consumed by every Nebutra app. Apps import via:

```css
/* apps/{app}/src/app/globals.css */
@import "tailwindcss";
@import "@nebutra/tokens/styles.css";
```

Tokens are organized in three concentric rings:

```
Brand scales (raw)            → --nebutra-blue-{50..950}, --nebutra-cyan-{50..950}, --nebutra-neutral-{50..950}
12-step semantic scales       → --neutral-{1..12}, --blue-{1..12}, --cyan-{1..12}
Aliased semantic tokens       → --background, --foreground, --primary, --brand-primary, --status-*
```

---

## 2. Tokens

### 2.1 Brand color scales (locked anchors)

#### 云毓蓝 (`--nebutra-blue-*`)

| Step | Hex |
|------|-----|
| 50 | `#F0F4FF` |
| 100 | `#DBE4FF` |
| 200 | `#BAC8FF` |
| 300 | `#91A7FF` |
| 400 | `#5C7CFA` |
| **500** | **`#0033FE`** (base) |
| 600 | `#002AD4` |
| 700 | `#0021AB` |
| 800 | `#001882` |
| 900 | `#000F59` |
| 950 | `#000830` |

#### 云毓青 (`--nebutra-cyan-*`)

| Step | Hex |
|------|-----|
| 50 | `#E6FFF8` |
| 100 | `#B3FFEC` |
| 200 | `#80FFE0` |
| 300 | `#4DFCD4` |
| 400 | `#1AF7C8` |
| **500** | **`#0BF1C3`** (base) |
| 600 | `#09C9A3` |
| 700 | `#07A183` |
| 800 | `#057963` |
| 900 | `#035143` |
| 950 | `#012923` |

#### Neutral (blue-undertone slate; `--nebutra-neutral-*`)

| Step | Hex |
|------|-----|
| 50 | `#F8FAFC` |
| 100 | `#F1F5F9` |
| 200 | `#E2E8F0` |
| 300 | `#CBD5E1` |
| 400 | `#94A3B8` |
| 500 | `#64748B` |
| 600 | `#475569` |
| 700 | `#334155` |
| 800 | `#1E293B` |
| 900 | `#0F172A` |
| 950 | `#020617` |

> Wide-gamut: when the display supports `display-p3`, `--nebutra-brand-blue` and `--nebutra-brand-cyan` upgrade automatically to richer P3 values (`color(display-p3 …)` syntax).

### 2.2 12-step functional scales — semantic ladder

Each scale obeys this Geist-style mapping:

| Steps | Role |
|-------|------|
| 1–2 | Backgrounds (app, subtle) |
| 3–5 | Component bg (default / hover / active) |
| 6–8 | Borders (subtle / default / hover) |
| 9–10 | Solid fills (default / hover) |
| 11 | Low-contrast / secondary text |
| 12 | High-contrast / primary text |

Scales: `--neutral-{1..12}`, `--blue-{1..12}`, `--cyan-{1..12}`. Light values are derived from the brand scales above; dark values invert the order so `step 1 = darkest, step 12 = lightest`. Full mapping table is in [root DESIGN.md §2.1](../../DESIGN.md#21-color--12-step-functional-scales).

### 2.3 Brand aliases (canonical for app code)

| Token | Resolves to | Use |
|-------|-------------|-----|
| `--brand-primary` | `var(--blue-9)` → `#0033FE` | Primary brand |
| `--brand-accent` | `var(--cyan-9)` → `#0BF1C3` | Accent |
| `--brand-tertiary` | `#8B5CF6` | Data viz / infra tags only |
| `--brand-gradient` | `linear-gradient(135deg, blue-500 → cyan-500)` | CTAs, hero text |

### 2.4 Semantic theme tokens (HSL triplets — Tailwind compatible)

These are stored as space-separated HSL triplets so Tailwind v4 can consume them via `hsl(var(--token))`.

| Token | Light value | Dark value | Tailwind class |
|------|-------------|-----------|---------------|
| `--background` | `0 0% 100%` | `222 47% 4%` | `bg-background` |
| `--foreground` | `222 47% 11%` | `210 40% 98%` | `text-foreground` |
| `--card` | `0 0% 100%` | `222 47% 7%` | `bg-card` |
| `--popover` | `0 0% 100%` | `222 47% 7%` | `bg-popover` |
| `--primary` | `228 85% 56%` | `228 90% 72%` | `bg-primary` |
| `--secondary` | `210 40% 96%` | `217 33% 17%` | `bg-secondary` |
| `--muted` | `210 40% 96%` | `217 33% 17%` | `bg-muted` |
| `--accent` | `228 100% 97%` | `228 100% 12%` | `bg-accent` |
| `--destructive` | `0 84% 45%` | `0 63% 31%` | `bg-destructive` |
| `--success` | `142 71% 29%` | `142 76% 36%` | `bg-success` |
| `--warning` | `38 92% 50%` | `38 80% 45%` | `bg-warning` |
| `--info` | `228 100% 50%` | `228 95% 67%` | `bg-info` |
| `--border` | `240 5.9% 90%` | `217 33% 17%` | `border-border` |
| `--ring` | `228 100% 50%` | `228 95% 67%` | `ring-ring` |

### 2.5 Status colors (direct hex — for SVG, charts, inline)

| Token | Hex |
|-------|-----|
| `--status-danger` | `#EF4444` |
| `--status-warning` | `#F59E0B` |
| `--status-success` | `#10B981` |
| `--status-info` | `var(--brand-primary)` |

### 2.6 Geist DS scale (interop with 21st.dev / Geist components)

`--ds-blue-{200,700,900}`, `--ds-red-*`, `--ds-amber-*`, `--ds-green-*`, `--ds-teal-*`, `--ds-purple-*`, `--ds-pink-*`, `--ds-gray-{100..1000}`, `--ds-background-100`, plus accent gradients `--ds-trial-*`, `--ds-turbo-*`. Stored as oklch (with sRGB hsla fallback for legacy engines).

### 2.7 Layout containers

| Token | Value |
|-------|-------|
| `--container-text` | `896px` |
| `--container-content` | `1152px` |
| `--container-wide` | `1400px` |

### 2.8 Radius scale

```
--radius-none: 0
--radius-sm:   0.25rem  (4px)
--radius-md:   0.375rem (6px)   ← default --radius
--radius-lg:   0.5rem   (8px)
--radius-xl:   0.75rem  (12px)
--radius-2xl:  1rem     (16px)
--radius-3xl:  1.5rem   (24px)
--radius-full: 9999px
```

### 2.9 Elevation / shadow

| Token | Light | Dark |
|------|-------|------|
| `--elevation-xs` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | `0 1px 2px 0 rgb(0 0 0 / 0.3)` |
| `--elevation-sm` | small card shadow | higher-contrast variant |
| `--elevation-md` | dropdown shadow | — |
| `--elevation-lg` | floating panel | — |
| `--elevation-xl` | modal | — |
| `--elevation-2xl` | top overlay | — |
| `--elevation-brand` | `0 0 0 1px rgb(0 51 254 / 0.15), 0 4px 20px -2px rgb(0 51 254 / 0.2)` | uses `#5C7CFA` glow |
| `--elevation-brand-lg` | hero CTA | hero CTA dark |

Aliased to Tailwind: `shadow-{xs,sm,md,lg,xl,2xl,brand,brand-lg}`.

### 2.10 Motion

Easing:

```
--ease-in:      cubic-bezier(0.4, 0, 1, 1)
--ease-out:     cubic-bezier(0, 0, 0.2, 1)
--ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1)
--ease-spring:  cubic-bezier(0.175, 0.885, 0.32, 1.275)
```

Duration:

```
--duration-fast:    100ms
--duration-normal:  150ms
--duration-slow:    300ms
--duration-slower:  500ms
```

Reduced motion: a global `@media (prefers-reduced-motion: reduce)` block in `styles.css` collapses all animation/transition durations to `0.01ms`.

### 2.11 Typography utilities

Geist-style named utilities defined via Tailwind v4 `@utility`. Naming pattern: `text-{role}-{px}[-strong|-mono|-tabular]`.

| Role | Sizes (px) |
|------|-----------|
| `text-heading-{px}` | 72, 64, 56, 48, 40, 32, 24, 20, 16, 14 |
| `text-button-{px}` | 16, 14, 12 |
| `text-label-{px}[-strong/-mono/-tabular]` | 20, 18, 16, 14, 13, 12 |
| `text-copy-{px}[-strong/-mono]` | 24, 20, 18, 16, 14, 13 |

Plus `font-cn` (CJK utility, `line-height: 1.75`, word-break-aware). Auto-activates on `<html lang="zh|ja|ko">`.

### 2.12 Chart colors

`--chart-{1..5}` — light: blue-500, cyan-500, purple, cyan-300, blue-700. Dark: brighter equivalents.

---

## 3. Patterns

### 3.1 Tailwind class usage (canonical)

```tsx
// 12-step scale classes
<div className="bg-neutral-3 text-neutral-12 border-neutral-7" />
<div className="bg-blue-9 text-cyan-11" />

// Semantic Tailwind classes
<div className="bg-primary text-primary-foreground" />
<div className="bg-destructive text-destructive-foreground" />

// Brand aliases
<div className="bg-brand-primary text-brand-accent" />

// Inline CSS variables (for SVG, recharts, dynamic values)
<stop stopColor="var(--brand-primary)" />
<Cell fill="var(--brand-accent)" />
<div style={{ background: "var(--brand-gradient)" }} />

// Arbitrary Tailwind for non-scale tokens
<div className="text-[color:var(--status-warning)]" />
```

### 3.2 ThemeProvider wiring (per app)

```tsx
// apps/{app}/src/app/layout.tsx
import { ThemeProvider } from "@nebutra/tokens";

<html lang="en" suppressHydrationWarning>
  <body>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  </body>
</html>
```

---

## 4. Imports & Conventions

### Allowed

```ts
import { ThemeProvider, useTheme } from "@nebutra/tokens";
```

```css
@import "@nebutra/tokens/styles.css";
```

### Forbidden

```tsx
// ❌ Hardcoded brand hex
<div style={{ color: "#0033FE" }} />

// ❌ Importing JS color tokens in runtime
import { colors } from "@nebutra/ui/theme";  // deprecated

// ❌ Adding raw hex into Tailwind arbitrary classes for brand colors
<div className="bg-[#0a0a0a]" />   // → bg-neutral-1
```

---

## 5. Theming

Light/dark switching: handled by `next-themes` via the `class` attribute. The `.dark` selector inside `styles.css` overrides every semantic token plus inverts the 12-step scales (step 1 = darkest, step 12 = lightest in dark mode).

For the **multi-theme product feature** (6 oklch presets), see [`packages/theme/DESIGN.md`](../theme/DESIGN.md).

---

## 6. Versioning & Governance

| Surface | Status |
|--------|--------|
| Brand color hex anchors (`#0033FE`, `#0BF1C3`, `--nebutra-neutral-{50..950}`) | **Locked** |
| 12-step semantic ladder positions (1–12 meaning) | **Locked** |
| Container widths | **Locked** |
| Radius scale values | **Locked** |
| Status color hex | **Locked** |
| Adding a new semantic token | Extensible — must come with both light + dark values and Tailwind binding |
| Adding a new typography utility | Extensible — must follow `text-{role}-{px}` naming |
| Removing/renaming any token | **Forbidden** without a codemod (`scripts/codemod-tokens.ts`) |

### Governance scripts

```bash
pnpm --filter @nebutra/tokens typecheck
node scripts/codemod-tokens.ts                 # migrate hex → tokens
pnpm tsx scripts/validate-ui-governance-policy.ts
```

---

## 7. Open questions / review notes

- The HSL semantic tokens (`--primary` etc.) and the 12-step scales (`--blue-9` etc.) have separate value definitions. The `--primary` light value `228 85% 56%` (#254bfa) is intentionally *softer* than `--blue-9` (#0033FE) for Shadcn-style emphasis. Document this rationale once more in §2.4.
- `--ds-*` Geist colors duplicate some 12-step scales — verify whether they can be consolidated when 21st.dev components are migrated.

---

← back to [root DESIGN.md](../../DESIGN.md) ·
peer specs: [brand](../brand/DESIGN.md) · [theme](../theme/DESIGN.md) · [ui](../ui/DESIGN.md)
