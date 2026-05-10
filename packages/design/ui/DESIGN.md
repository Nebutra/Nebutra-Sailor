# `@nebutra/ui` — Design Spec

> Component library of the Nebutra-Sailor design system.
> Part of the [root DESIGN.md](../../DESIGN.md). Spec format: `design-md@2026.05`.

| Field | Value |
|------|------|
| Package | `@nebutra/ui` |
| Status | Stable, actively expanding |
| Source root | `packages/design/ui/src/` |
| Storybook | `apps/storybook` (dev: http://localhost:6006) |
| Subpath exports | `@nebutra/ui/components`, `@nebutra/ui/layout`, `@nebutra/ui/marketing`, `@nebutra/ui/utils` |
| Composition | Radix UI + HeroUI + Lobe UI re-exports + custom |

> **Note**: `@nebutra/design-system` has been **merged into** `@nebutra/ui`. Layout components now live at `@nebutra/ui/layout`.

---

## 1. Identity

`@nebutra/ui` is the only UI dependency app code should reach for. It composes:

- **Radix UI** primitives (accessibility-first headless behaviour)
- **HeroUI** (visual styles where Radix lacks an equivalent — minimal use)
- **Lobe UI** re-exports (chat / AI-product widgets, themed via `NebutraThemeProvider`)
- **21st.dev** community-vetted patterns
- Custom components built strictly on top of `@nebutra/tokens` CSS variables

**Component-creation rule (locked, see project memory)**: do not hand-craft components. Priority — Geist source → 21st.dev → HeroUI/Radix → hand-craft (last resort). No inline SVG icons; always import from `@nebutra/icons` or `lucide-react`.

---

## 2. Tokens

This package **consumes** tokens from `@nebutra/tokens` exclusively. It does not declare new tokens. Internal Lobe UI components are bridged via `NebutraThemeProvider` (`packages/design/ui/src/theme/`) which maps Nebutra brand tokens into Lobe UI's expected shape.

---

## 3. Components

The library exports ~250 components organized into 5 categories. Storybook is the canonical visual catalogue; below is the structural map.

### 3.1 Categories & locations

| Category | Path | Subpath export | Approx count |
|---------|------|----------------|-------------|
| Primitives | `src/primitives/` | `@nebutra/ui/components` | 180+ |
| Patterns (composite) | `src/patterns/` | `@nebutra/ui/components` | 8 |
| Marketing sections | `src/marketing/` | `@nebutra/ui/marketing` | 40+ |
| Layout scaffolding | `src/layout/` | `@nebutra/ui/layout` | 8 |
| Decorations | `src/decorations/` | `@nebutra/ui/components` | several |
| Widgets | `src/widgets/` | `@nebutra/ui/components` | small set |
| Typography | `src/typography/` | `@nebutra/ui/components` | small set |

### 3.2 Primitives — selected reference

| Component | Variants / props (high level) | Source pattern |
|-----------|-------------------------------|----------------|
| `Button` | `intent` (primary/secondary/ghost/outline/destructive), `size` (sm/md/lg), `loading`, `asChild` | CVA + Radix `Slot` |
| `Input` | `size`, `intent`, `prefix`, `suffix`, `loading` | CVA |
| `Card` | `size` (sm/md/lg), `interactive`, `gradient` | CVA |
| `Dialog` | controlled / uncontrolled, `size`, custom `Footer` slot | Radix |
| `Tabs` | `orientation`, `variant` (line/pill/segment), Radix-driven | Radix |
| `Tooltip`, `Popover`, `HoverCard` | Radix-driven, brand focus ring | Radix |
| `Switch`, `Checkbox`, `RadioGroup` | brand-blue solid fill, accessible labels | Radix |
| `Select`, `Combobox`, `MultipleSelector` | `size`, async options, virtualized | Radix + cmdk |
| `Badge`, `StatusBadge`, `ColorBadge`, `Kbd` | semantic intent variants | CVA |
| `Avatar`, `AvatarCircles`, `AvatarSmartGroup` | size scale, fallback initials | Radix |
| `Skeleton`, `Spinner`, `LoadingDots`, `Loader` | brand-aware loading | CSS |
| `AnimateIn`, `AnimateInGroup`, `AnimatedGroup`, `AnimatedList` | Framer Motion entrance presets | brand motion |
| `Heading`, `Text` | Geist-style typography utilities | tokens |
| `Gauge`, `KpiCard`, `MetricCard`, `Chart` | data viz, semantic chart colors | recharts |

### 3.3 Patterns

| Pattern | Purpose |
|---------|---------|
| `DataTable` (`src/patterns/data-table/`) | Column-driven table with sorting, filtering, pagination, row selection |
| `CommandBox` | ⌘K-style command palette wrapper around `cmdk` |
| `Terminal` (`src/patterns/Terminal/`) | Animated terminal output, pulse cursor |
| `Card` (`src/patterns/Card/`) | Composite card layouts (header/body/footer slots) |
| `settings-layout` | Sidebar-driven settings page scaffold |

### 3.4 Marketing sections

Self-contained landing-page blocks with prop-driven content. Examples:

| Component | Purpose |
|-----------|---------|
| `Hero`, `AnimatedHeadline`, `SmoothScrollHero` | Above-the-fold sections |
| `Pricing`, `PricingSection`, `PricingCard` | Tiered pricing |
| `Features`, `FeaturesBento`, `FeatureCarousel`, `FeatureSplitSection`, `FeatureCardsSection` | Capability showcases |
| `Testimonials`, `StaggerTestimonials` | Social proof |
| `LogoCloud`, `LogoCloudGrid`, `CustomersSection` | Customer logos |
| `FAQ`, `FaqBlock` | FAQ accordions |
| `Footer`, `FooterLinks` | Site footers |
| `Navbar`, `Banner`, `UpgradeBanner` | Navigation chrome |
| `Globe`, `DottedWorldMap`, `CosmicSpectrum`, `GridPattern`, `Marquee` | Visual flair |
| `CTA`, `CTASection`, `CTAWithTextMarquee` | Conversion blocks |

### 3.5 Layout scaffolding (`@nebutra/ui/layout`)

| Component | Purpose |
|-----------|---------|
| `PageHeader` | Page title + description + actions row |
| `Section` | Vertical-rhythm section wrapper |
| `Container` | Width-constrained content (text / content / wide) |
| `Card` | Page-card wrapper (re-exported variant) |
| `EmptyState` | Empty / no-data placeholder |
| `LoadingState` | Page-level loading skeleton |
| `ErrorState` | Page-level error placeholder |
| `DesignSystemProvider` | Provider that wires `NebutraThemeProvider` + tokens |

### 3.6 Variants pattern

All components with multiple visual variants use **CVA**:

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@nebutra/ui/utils";

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow",
  {
    variants: {
      size: { sm: "p-4", md: "p-6", lg: "p-8" },
      interactive: { true: "cursor-pointer hover:shadow-md", false: "" },
    },
    defaultVariants: { size: "md", interactive: false },
  },
);

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ size, interactive, className, ...props }: CardProps) {
  return <div className={cn(cardVariants({ size, interactive }), className)} {...props} />;
}
```

---

## 4. Patterns

### 4.1 Brand gradient text

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

### 4.2 Animated entrance (canonical)

```tsx
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";

// Single element
<AnimateIn preset="emerge">
  <Hero />
</AnimateIn>

// Staggered list
<AnimateInGroup stagger="normal" className="grid grid-cols-3 gap-6">
  {items.map((item) => (
    <AnimateIn key={item.id} preset="fadeUp">
      <Card>{item.title}</Card>
    </AnimateIn>
  ))}
</AnimateInGroup>

// Scroll-triggered
<AnimateIn preset="emerge" inView>
  <FeatureSection />
</AnimateIn>
```

Presets: `emerge` (default — blur+rise), `flow` (slide-left), `fade`, `fadeUp`, `scale`.

### 4.3 Accessible icon button

```tsx
import { X } from "@nebutra/icons";

<button
  type="button"
  aria-label="Close dialog"
  className="rounded-md p-1 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1"
>
  <X className="h-4 w-4" />
</button>
```

### 4.4 Container width selection

| Container | When to use |
|-----------|-------------|
| `max-w-[var(--container-text)]` (896px) | Hero copy, CTA, FAQ — reading-optimized |
| `max-w-[var(--container-content)]` (1152px) | Pricing, blog, architecture diagrams |
| `max-w-[1400px]` (`--container-wide`) | Feature bento, testimonials, navbar, product demos |

---

## 5. Imports & Conventions

### 5.1 Canonical imports

```tsx
import { Button, Input, Card, Dialog, Tabs } from "@nebutra/ui/components";
import { PageHeader, EmptyState, Section, Container } from "@nebutra/ui/layout";
import { Hero, Pricing, Features, FAQ, Footer, Navbar } from "@nebutra/ui/marketing";
import { cn } from "@nebutra/ui/utils";
import { Search, Settings } from "@nebutra/icons";
import { ChevronRight } from "lucide-react"; // only when no Geist equivalent
```

### 5.2 Adding a new component

1. **Pick a layer**: primitive vs pattern vs marketing vs layout.
2. **File structure**:
   ```
   src/{layer}/my-component.tsx
   src/{layer}/my-component.stories.tsx   ← REQUIRED
   src/{layer}/index.ts                   ← add export
   ```
3. **Storybook story** is mandatory:
   ```tsx
   import type { Meta, StoryObj } from "@storybook/react";
   import { MyComponent } from "./my-component";

   const meta: Meta<typeof MyComponent> = {
     title: "Primitives/MyComponent",
     component: MyComponent,
     tags: ["autodocs"],
   };
   export default meta;
   type Story = StoryObj<typeof MyComponent>;

   export const Default: Story = { args: { /* … */ } };
   export const AllVariants: Story = { render: () => (/* showcase */) };
   ```
4. **Type-checked accessibility**: every interactive element must have `type="button"`, `aria-label` on icon-only triggers, and the brand focus ring.
5. **Prove tokens-only styling**: search for hex values in your diff — should be zero (except `global-error.tsx` exception).

### 5.3 Forbidden

```tsx
// ❌ Removed package
import { Box } from "@primer/react";

// ❌ Inline SVG icons — use @nebutra/icons / lucide-react
<svg viewBox="0 0 24 24">…</svg>

// ❌ Hardcoded brand colors
<div style={{ color: "#0033FE" }} />

// ❌ Raw motion.div with hand-tuned animation values
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} />

// ❌ New HeroUI imports when Radix has an equivalent
import { HeroNewComponent } from "@heroui/new-component";

// ❌ Component without a Storybook story
// ❌ console.log (use @nebutra/logger)
```

Enforced by: `scripts/validate-ui-governance-policy.ts`, ESLint `no-console`, Storybook coverage check.

---

## 6. Theming

Components style themselves entirely from `@nebutra/tokens` CSS variables. They automatically:

- Switch with `class="dark"` (light/dark)
- Switch with `[data-theme="…"]` (multi-theme presets)

No component-level theming knobs — if you need different visual treatment, define a CVA variant or a new component, not a theme override.

The `NebutraThemeProvider` wrapper in `src/theme/` exists **only** to bridge Lobe UI components to Nebutra brand tokens. App code rarely uses it directly — `DesignSystemProvider` from `@nebutra/ui/layout` composes it correctly.

---

## 7. Versioning & Governance

| Surface | Status |
|--------|--------|
| Public component API (props, slots) | Semver-tracked — breaking changes require a major bump and codemod |
| Internal CVA variant strings | Internal — may change in minors |
| Adding a new component | Extensible — story required, a11y check required |
| Removing a component | Forbidden without a deprecation cycle (one minor with `@deprecated` JSDoc, then removal) |
| Importing from `@nebutra/design-system` | **Forbidden** — alias merged into `@nebutra/ui/layout` |
| Importing from `@primer/react` | **Forbidden** — package removed |

### Governance & verification scripts

```bash
pnpm --filter @nebutra/ui typecheck
pnpm --filter @nebutra/storybook dev          # local visual review
pnpm --filter @nebutra/storybook typecheck    # story type safety
pnpm tsx scripts/validate-ui-governance-policy.ts
```

---

## 8. Open questions / review notes

- HeroUI vs Radix overlap: components using HeroUI's visual style sometimes mismatch Geist (project memory note). Inventory those and re-skin / replace where Geist-native exists (Geist source > 21st.dev > HeroUI).
- `widgets/` folder lacks a clear charter vs `patterns/` — recommend documenting the boundary or merging.
- Some primitives (e.g. `mesh-gradient-bg.tsx`, `neuro-noise-bg.tsx`) are missing `.stories.tsx` files — fail-fast in Storybook coverage check should catch these.

---

← back to [root DESIGN.md](../../DESIGN.md) ·
peer specs: [brand](../brand/DESIGN.md) · [tokens](../tokens/DESIGN.md) · [theme](../theme/DESIGN.md)
