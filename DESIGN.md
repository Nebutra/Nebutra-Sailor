# Nebutra-Sailor Design System

> Single-file specification for the Nebutra-Sailor design system, written for the
> [design.md](https://designmd.me) ecosystem (2026). Consumable by humans, LLMs,
> and design tooling (Tokens Studio, Figma plugins, Storybook).

| Field | Value |
|------|------|
| **Spec version** | `design-md@2026.05` |
| **Project** | Nebutra-Sailor (`@nebutra/*`) |
| **Status** | Stable — mature tokens, expanding component surface |
| **Source of truth** | `packages/tokens/styles.css` (CSS variables) + `packages/brand/src/` (TS primitives) |
| **License** | Proprietary (internal). Public API of components published under MIT (see each package). |

Layered package map:

```
@nebutra/brand   → Brand primitives (TS source data, not consumed at runtime)
       ↓
@nebutra/tokens  → Runtime CSS variables (★ SOURCE OF TRUTH for apps)
       ↓
@nebutra/theme   → Multi-theme presets (6 oklch variants via [data-theme])
       ↓
@nebutra/ui      → Component library (Radix + HeroUI + Lobe UI + custom)
@nebutra/icons   → 541 Geist icons as tree-shakable TSX
```

Sub-specs (per package):

- [`packages/brand/DESIGN.md`](./packages/brand/DESIGN.md) — brand identity layer
- [`packages/tokens/DESIGN.md`](./packages/tokens/DESIGN.md) — runtime token layer
- [`packages/theme/DESIGN.md`](./packages/theme/DESIGN.md) — multi-theme engine
- [`packages/ui/DESIGN.md`](./packages/ui/DESIGN.md) — component library

---

## 1. Identity

### 1.1 Brand

| Field | English | 中文 |
|------|--------|------|
| Brand name | Nebutra | 云毓智能 |
| Legal entity | Wuxi Nebutra Intelligence Technology Co., Ltd. | 无锡云毓智能科技有限公司 |
| Tagline | Ship AI products, not boilerplate. | AI原生·快速出海·即刻交付 |
| Voice | Confident, technical, founder-empathic — never marketing-fluffy | — |
| Audience (ICP) | AI founders & SaaS teams (1–10 engineers) | — |

**Logo concept** (locked): geometric negative-space "N" forming an implicit hexagon — symbolizing stable scaffolding for AI infrastructure. The blue→cyan gradient represents the cloud platform (云) nurturing intelligence (毓).

### 1.2 Brand Colors (locked, do not modify without a brand-level RFC)

| Token | Hex (sRGB) | Display-P3 fallback | Use |
|-------|-----------|--------------------|-----|
| `--nebutra-brand-blue` / **云毓蓝** | `#0033FE` | `color(display-p3 0.03 0.19 0.99)` | Primary brand, CTA, focus ring |
| `--nebutra-brand-cyan` / **云毓青** | `#0BF1C3` | `color(display-p3 0.07 0.94 0.79)` | Accent, success highlight, gradient terminus |
| `--brand-tertiary` | `#8B5CF6` | — | Data viz / infrastructure tags only |
| `--brand-gradient` | `linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)` | — | Hero text, CTA buttons, section dividers |

### 1.3 Typography stack

| Role | Family | CSS variable | Notes |
|------|--------|-------------|-------|
| Display / heading | Poppins | `--font-display` | Western — locked |
| UI sans (body, label, button) | Poppins → vivo Sans → PingFang SC → Microsoft YaHei → Noto Sans SC → system | `--font-sans` | CJK-aware fallback chain |
| CJK body | vivo Sans → PingFang SC → Microsoft YaHei → Noto Sans SC | `--font-cn` | Auto-activates via `:lang(zh|ja|ko)` |
| Mono | JetBrains Mono → Fira Code → ui-monospace | `--font-mono` | Code, tabular figures |

Loaded via `next/font` per app — never via `<link>` or `@import`.

---

## 2. Tokens

All runtime tokens live in `packages/tokens/styles.css` and are mirrored to Tailwind v4 via `@theme inline`. Below is the DTCG-friendly summary; see [`packages/tokens/DESIGN.md`](./packages/tokens/DESIGN.md) for the full catalogue.

### 2.1 Color — 12-step functional scales

Each scale follows the **Geist semantic ladder**: 1–2 backgrounds, 3–5 component surfaces, 6–8 borders, 9–10 solid fills, 11–12 text.

#### Neutral (UI chrome, surfaces, text hierarchy)

| Token | Light | Dark | Semantic role |
|------|------|------|----------------|
| `--neutral-1` | `#FFFFFF` | `#020617` | App background |
| `--neutral-2` | `#F8FAFC` | `#0F172A` | Subtle background |
| `--neutral-3` | `#F1F5F9` | `#1E293B` | Component bg (default) |
| `--neutral-4` | `#E2E8F0` | `#334155` | Component bg (hover) |
| `--neutral-5` | `#CBD5E1` | `#475569` | Component bg (active) |
| `--neutral-6` | `#E2E8F0` | `#1E293B` | Subtle border |
| `--neutral-7` | `#CBD5E1` | `#334155` | Default border |
| `--neutral-8` | `#94A3B8` | `#475569` | Hovered border |
| `--neutral-9` | `#64748B` | `#94A3B8` | Solid fill |
| `--neutral-10` | `#475569` | `#CBD5E1` | Solid fill (hover) |
| `--neutral-11` | `#334155` | `#E2E8F0` | Secondary text |
| `--neutral-12` | `#0F172A` | `#F8FAFC` | Primary text |

#### Blue (云毓蓝) — primary accent

| Step | Hex | Use |
|------|-----|-----|
| `--blue-1` | `#F0F4FF` | Subtle bg |
| `--blue-3` | `#BAC8FF` | Component bg default |
| `--blue-7` | `#91A7FF` | Default border |
| `--blue-9` | `#0033FE` | **Primary fill** (= `--brand-primary`) |
| `--blue-11` | `#0021AB` | Secondary text on light |
| `--blue-12` | `#000F59` | Primary text on light |

#### Cyan (云毓青) — accent

| Step | Hex | Use |
|------|-----|-----|
| `--cyan-1` | `#E6FFF8` | Subtle bg |
| `--cyan-3` | `#80FFE0` | Component bg default |
| `--cyan-9` | `#0BF1C3` | **Accent fill** (= `--brand-accent`) |
| `--cyan-11` | `#07A183` | Secondary text on light |

Full scales (50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950) are exposed as `--nebutra-blue-{step}`, `--nebutra-cyan-{step}`, `--nebutra-neutral-{step}`.

### 2.2 Status color tokens

For inline styles, SVG, and charts use these direct tokens. For Tailwind classes use the semantic alias (`bg-destructive`, `bg-success`, etc.).

| Token | Light hex | Tailwind class |
|------|-----------|----------------|
| `--status-danger` | `#EF4444` | `bg-destructive` |
| `--status-warning` | `#F59E0B` | `bg-warning` |
| `--status-success` | `#10B981` | `bg-success` |
| `--status-info` | `var(--brand-primary)` | `bg-info` |

### 2.3 Typography scale

Geist-style named utilities. Encoded format: `text-{role}-{px-size}[-strong|-mono|-tabular]`.

| Role | Sizes | Font | Weight |
|------|-------|------|--------|
| `text-heading-{72,64,56,48,40}` | display | `--font-display` | 700 |
| `text-heading-{32,24,20,16,14}` | display | `--font-display` | 600 |
| `text-button-{16,14,12}` | UI | `--font-sans` | 500 |
| `text-label-{20,18,16,14,13,12}` | UI | `--font-sans` | 500 |
| `text-copy-{24,20,18,16,14,13}` | body | `--font-sans` | 400 |
| `…-strong` suffix | — | — | 600 |
| `…-mono` suffix | — | `--font-mono` | 500 / 400 |
| `…-tabular` suffix | — | `--font-sans` + `tabular-nums` | 500 |

### 2.4 Radius

| Token | Value | Use |
|------|-------|-----|
| `--radius-none` | `0` | Square corners |
| `--radius-sm` | `0.25rem` (4px) | Badges, chips, tags |
| `--radius-md` | `0.375rem` (6px) | Buttons, inputs, selects (default `--radius`) |
| `--radius-lg` | `0.5rem` (8px) | Cards, panels |
| `--radius-xl` | `0.75rem` (12px) | Larger cards, popovers |
| `--radius-2xl` | `1rem` (16px) | Modals, drawers |
| `--radius-3xl` | `1.5rem` (24px) | Large panels |
| `--radius-full` | `9999px` | Pills, avatars, icon buttons |

### 2.5 Elevation / Shadow

| Token | Layer |
|------|-------|
| `--shadow-xs` | Hovered rows, focused inputs |
| `--shadow-sm` | Cards, tooltips |
| `--shadow-md` | Dropdowns, popovers |
| `--shadow-lg` | Sticky headers, floating panels |
| `--shadow-xl` | Modals, dialogs |
| `--shadow-2xl` | Top-level overlays |
| `--shadow-brand` | Brand-glow CTA (云毓蓝 #0033FE backdrop) |
| `--shadow-brand-lg` | Hero CTA / featured tile |

Dark mode glow uses `#5C7CFA` (nebutra-blue-400) for visibility on `#020617`.

### 2.6 Motion

| Token | Value | Use |
|------|-------|-----|
| `--duration-micro` | `100ms` | Hover, focus, toggle, button press |
| `--duration-flow` | `200ms` | Modal, dropdown, tab — **default state transition** |
| `--duration-reveal` | `300ms` | Slide, expand, accordion, drawer |
| `--duration-cinematic` | `500ms` | Hero entrance, large delight moments |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Exit animations |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Enter animations |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Bidirectional |
| `--ease-spring` | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Playful bounce |

**Brand motion language** (3 signatures, derived from the "云端聚合" concept; see `packages/brand/src/motion.ts`):

| Signature | 中文 | Initial → Animate | Use |
|----------|------|---------------------|-----|
| `emerge` | 涌现 | `opacity: 0, y: 16, blur: 6px` → reset | Default entrance |
| `flow` | 流动 | `opacity: 0, x: -20` → reset | List items, sidebar reveals |
| `pulse` | 脉动 | `scale: [1, 1.015, 1]` loop | Live indicators |
| `float` | 漂浮 | `y: [0, -8, 0]` loop | Floating UI chrome |

### 2.7 Gradient

| Token | Value | Use |
|------|-------|-----|
| `--gradient-brand` | `linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)` | Hero text, CTAs |
| `--gradient-brand-hover` | reverse direction | Hover states |
| `--gradient-section` | `180deg` (vertical) | Section dividers |
| `--gradient-glow` | `radial-gradient(...)` | Blur halos behind cards |

### 2.8 Layout containers (locked widths)

| Token | Value | Use |
|------|-------|-----|
| `--container-text` | `896px` | Reading-focused (hero copy, FAQ, CTA) |
| `--container-content` | `1152px` | Pricing, blog, architecture |
| `--container-wide` | `1400px` | Feature bento, navbar, product demos |

---

## 3. Components

The component library lives in `@nebutra/ui` (~250 components across primitives, patterns, marketing, layout). Browse the full inventory in [`packages/ui/DESIGN.md`](./packages/ui/DESIGN.md).

### 3.1 Import map

| Subpath | Contents |
|---------|----------|
| `@nebutra/ui/components` | Primitives + patterns (Button, Input, Card, Dialog, DataTable, …) |
| `@nebutra/ui/layout` | App scaffolding (`PageHeader`, `EmptyState`, `LoadingState`, `ErrorState`, `Section`, `Container`) |
| `@nebutra/ui/marketing` | Landing-page sections (`Hero`, `Pricing`, `Features`, `FAQ`, `Footer`, `Navbar`) |
| `@nebutra/ui/utils` | `cn()` className merge helper, hooks |
| `@nebutra/icons` | Geist icons (541 components) |
| `@nebutra/tokens` | `ThemeProvider`, `useTheme` (re-exported `next-themes`) |

```tsx
import { Button, Input, Card } from "@nebutra/ui/components";
import { PageHeader, EmptyState } from "@nebutra/ui/layout";
import { Search, Settings } from "@nebutra/icons";
import { ThemeProvider, useTheme } from "@nebutra/tokens";
```

### 3.2 Component categories

| Category | Count (approx) | Examples |
|---------|----------------|----------|
| Primitives | 180+ | Button, Input, Dialog, Tabs, Tooltip, Switch |
| Patterns | 8 | DataTable, CommandBox, Terminal, settings-layout |
| Marketing | 40+ | Hero, FeaturesBento, Pricing, Testimonials, Globe |
| Layout | 8 | PageHeader, Section, Container, EmptyState |
| Decorations | several | StarsCanvas, MeshGradientBg, FlickeringGrid |

Every component has a corresponding Storybook story in `apps/storybook/`. Components without a story fail CI via `validate-ui-governance-policy.ts`.

### 3.3 Variants pattern (CVA)

All variant-bearing components use [class-variance-authority](https://cva.style):

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@nebutra/ui/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      intent: {
        primary: "bg-brand-primary text-white hover:bg-blue-10",
        secondary: "bg-neutral-3 text-neutral-12 hover:bg-neutral-4",
        ghost: "text-neutral-11 hover:bg-neutral-3",
      },
      size: { sm: "h-8 px-3 text-sm", md: "h-10 px-4", lg: "h-12 px-6 text-lg" },
    },
    defaultVariants: { intent: "primary", size: "md" },
  },
);
```

---

## 4. Patterns

### 4.1 Brand gradient text (canonical)

```tsx
<h1
  className="text-heading-72 font-bold"
  style={{
    background: "var(--brand-gradient)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  }}
>
  Ship AI products, not boilerplate.
</h1>
```

### 4.2 Animation entrance (always use `AnimateIn`)

```tsx
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";

<AnimateInGroup stagger="normal" className="grid grid-cols-3 gap-6">
  {items.map((item) => (
    <AnimateIn key={item.id} preset="fadeUp">
      <Card>{item.title}</Card>
    </AnimateIn>
  ))}
</AnimateInGroup>
```

Presets: `emerge` (default — blur+rise), `flow` (slide-left), `fade`, `fadeUp`, `scale`. Raw `motion.div` with hardcoded animation values is forbidden.

### 4.3 Accessibility minimum bar

Every interactive element must satisfy:

- `<button>` has explicit `type="button"` (never default `submit`)
- Icon-only buttons carry `aria-label`
- Focus ring is brand-blue: `focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1`
- Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI chrome
- All animations respect `prefers-reduced-motion: reduce` (handled globally in `tokens/styles.css`)

### 4.4 Semantic HTML

Components export accessible primitives by default (Radix under the hood). Do not wrap them in extra `<div role="…">` unless a specific WAI-ARIA pattern requires it.

---

## 5. Imports & Conventions

### 5.1 Allowed import sources

| Need | Import from | Notes |
|-----|-------------|------|
| UI primitive | `@nebutra/ui/components` | Includes Lobe UI re-exports |
| Layout wrapper | `@nebutra/ui/layout` | (`@nebutra/design-system` is **deprecated** — merged into `@nebutra/ui/layout`) |
| Geist icon | `@nebutra/icons` | Tree-shakable |
| Generic icon | `lucide-react` | Only when no Geist equivalent |
| Theme switching | `@nebutra/tokens` | Wraps `next-themes` |
| Lobe theme bridge | `@nebutra/ui` (`NebutraThemeProvider`) | Internal only |

### 5.2 Forbidden patterns (anti-patterns)

```tsx
// ❌ Removed package
import { Box, Button } from "@primer/react";

// ❌ Hardcoded brand hex — use --brand-primary
<div style={{ color: "#0033FE" }} />
<stop stopColor="#0033FE" />
<Cell fill="#0BF1C3" />

// ❌ Hardcoded status hex — use --status-* or semantic Tailwind
tagColor: "#ef4444";

// ❌ Raw motion.div with hand-tuned values — use AnimateIn
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} />

// ❌ New HeroUI imports when Radix has an equivalent
import { HeroNewComponent } from "@heroui/new-component";

// ❌ Components without a Storybook story
// ❌ console.log in production code (use @nebutra/logger)
```

### 5.3 Exception — `global-error.tsx`

Next.js `global-error.tsx` renders **outside** the root layout (no CSS context). Hardcoded hex values are permitted there because CSS variables are unavailable.

---

## 6. Theming

### 6.1 Light / Dark

`packages/tokens/styles.css` ships both modes. Switching is controlled by `next-themes` via the `class` attribute (`<html class="dark">`):

```tsx
import { ThemeProvider } from "@nebutra/tokens";

<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
  {children}
</ThemeProvider>
```

### 6.2 Multi-theme presets (product feature)

`packages/theme/themes.css` provides 6 oklch-based presets selected via `[data-theme="…"]` on the document root. Switching is handled by the SaaS preset system in `@nebutra/preset`.

| `data-theme` | Mood | Use case |
|------|------|----------|
| `neon` (default) | Vibrant dark, electric blue | AI SaaS dashboards |
| `gradient` | Soft light, blue spectrum | Marketing / growth |
| `dark-dense` | High-density dark | Pro tools, terminals |
| `minimal` | Neutral, low chroma | Document-heavy apps |
| `vibrant` | Saturated multicolor | Creator / consumer apps |
| `ocean` | Cool teal/blue | B2B finance, infra |

See [`packages/theme/DESIGN.md`](./packages/theme/DESIGN.md) for full token tables per theme.

### 6.3 Rebranding

Brand colors can be regenerated without touching components:

```bash
node scripts/generate-palette.mjs --primary=#7C3AED --secondary=#F59E0B
```

This rewrites `packages/tokens/styles.css` and `packages/brand/src/guidelines/color.ts`. All components automatically pick up the new palette.

---

## 7. Figma & Tooling

### 7.1 Figma integration (placeholder)

The Tokens Studio Figma plugin sync workflow is documented separately in `docs/figma-sync.md` (produced by the design-tooling agent). Token round-trip path:

```
Figma (Tokens Studio) ⇄ packages/tokens/styles.css (DTCG-mapped) ⇄ Tailwind v4 @theme inline
```

### 7.2 Storybook

| Environment | URL |
|------|-----|
| Local dev | `http://localhost:6006` (`pnpm --filter @nebutra/storybook dev`) |
| CI deploy | (TBD — Chromatic project URL) |

The Storybook **Design Tokens** section visualizes every token defined in this spec.

### 7.3 Visual regression

Chromatic runs on every PR to `main`. Diff threshold: 0.2% per snapshot.

---

## 8. Versioning & Governance

### 8.1 Who can extend what

| Surface | Status | Approval needed |
|--------|--------|-----------------|
| Brand colors (`#0033FE` / `#0BF1C3`) | **Locked** | Brand-level RFC |
| Brand gradient angle/stops | **Locked** | Brand-level RFC |
| 12-step semantic token positions (1–12 meaning) | **Locked** | Token RFC |
| Adding a new theme to `@nebutra/theme` | Extensible | Design-system maintainer review |
| Adding a new primitive component | Extensible | Storybook story + a11y check |
| Adding new status colors | **Locked** | Token RFC |
| Container widths | **Locked** | — |

### 8.2 Governance scripts

| Script | Purpose |
|--------|---------|
| `scripts/validate-ui-governance-policy.ts` | Enforces the policy schema |
| `scripts/codemod-tokens.ts` | Migrates raw hex → token references |
| `scripts/generate-palette.mjs` | Generates a full palette from primary + accent input |
| `scripts/check-legal-keys.js` | Locks brand metadata |
| `pnpm --filter @nebutra/ui typecheck` | Type-checks the component library |

### 8.3 Release cadence

- **Patch** (token bugfix, contrast adjustment): any merged PR
- **Minor** (new component, new theme): bi-weekly tag
- **Major** (token rename, breaking API): quarterly, with codemod

---

## 9. References

- `CLAUDE.md` — internal AI agent instructions (this DESIGN.md is the public face)
- `packages/brand/AGENTS.md` — brand layer agent guide
- `packages/brand/assets/vi/` — VI manual (PDF + extracted markdown)
- `packages/tokens/styles.css` — runtime token source of truth
- `packages/theme/themes.css` — multi-theme presets
- `packages/ui/src/components/index.ts` — component public exports
