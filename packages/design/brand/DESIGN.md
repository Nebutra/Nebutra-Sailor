# `@nebutra/brand` — Design Spec

> Brand identity layer of the Nebutra-Sailor design system.
> Part of the [root DESIGN.md](../../DESIGN.md). Spec format: `design-md@2026.05`.

| Field | Value |
|------|------|
| Package | `@nebutra/brand` |
| Status | **Locked source data** — runtime apps consume `@nebutra/tokens`, not this package |
| Source files | `packages/design/brand/src/{positioning,metadata,motion}.ts`, `packages/design/brand/src/guidelines/{color,logo}.ts` |
| VI manual | `packages/design/brand/assets/vi/` (PDF + extracted markdown) |

---

## 1. Identity

### 1.1 Names

| Field | English | 中文 |
|------|---------|------|
| Brand name | Nebutra | 云毓智能 |
| Legal entity | Wuxi Nebutra Intelligent Technology Co., Ltd. | 无锡云毓智能科技有限公司 |
| Tagline | Ship AI products, not boilerplate. | AI原生·快速出海·即刻交付 |
| Repo description (≤160 chars) | "AI-native SaaS monorepo: Next.js 16 + Hono + Python services · Clerk · Stripe · multi-tenancy · K8s · OTel · design system" | — |

### 1.2 Voice & positioning

- **ICP (primary)**: AI founders building SaaS with 1–10-engineer teams.
- **ICP (secondary)**: SaaS engineering teams adopting AI features into existing products.
- **Anti-target**: large enterprise platform-engineering teams (the template makes opinionated choices they will override).

Voice is **technical, founder-empathic, anti-fluff**. Every claim in marketing copy must be backed by an actual package or service in the monorepo (see `packages/design/brand/src/positioning.ts` `pillars` array).

### 1.3 Logo

- Concept: geometric negative-space "N" forming an implicit hexagon — symbolizing stable scaffolding.
- Color meaning: blue→cyan gradient = cloud platform (云) nurturing intelligence (毓).
- Logo assets, clear-space rules, and minimum sizes are in `packages/design/brand/assets/vi/`.
- **Locked**: do not redraw the mark; do not change the gradient direction (135°).

### 1.4 Brand values

```
AI Native · Ship Fast · Open by Default · Global-Ready · Enterprise-Grade
```

---

## 2. Tokens (brand layer)

These are **TS source primitives**. The runtime equivalent lives in `@nebutra/tokens` — see [`packages/design/tokens/DESIGN.md`](../tokens/DESIGN.md).

### 2.1 Colors — locked anchors

| Anchor | Hex | 中文 | Role |
|--------|-----|------|------|
| `colors.primary[500]` | `#0033FE` | 云毓蓝 | Primary brand — tech & trust |
| `colors.accent[500]` | `#0BF1C3` | 云毓青 | Data flow, intelligence |

> Note: `packages/design/brand/src/guidelines/color.ts` exports a 50–950 scale per anchor. The accent scale uses slightly different green-bias values than the runtime `@nebutra/tokens` cyan scale; the **runtime tokens** at `packages/design/tokens/styles.css` are the source of truth for what ships in apps. The brand `guidelines/color.ts` is the **design data** for VI / print / Figma.

### 2.2 Brand gradient

```ts
linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)
```

Direction (135°), stops (0% / 100%), and color anchors are **locked**.

### 2.3 Motion language (`packages/design/brand/src/motion.ts`)

| Export | 中文 | Concept |
|--------|------|---------|
| `emerge` | 涌现 | Data materializing from the cloud (default entrance) |
| `flow` | 流动 | Data streaming through pipelines |
| `pulse` | 脉动 | System breathing / alive indicator |
| `float` | 漂浮 | Gentle vertical drift for floating UI |

```ts
export const emerge = {
  initial: { opacity: 0, y: 16, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  transition: { duration: 0.6, ease: brandEasing.brand },
} as const;
```

Easing: `brandEasing.brand = [0.16, 1, 0.3, 1]` (signature curve — locked).
Spring presets: `default | bouncy | heavy | gentle` (`packages/design/brand/src/motion.ts`).

---

## 3. Patterns

### 3.1 When to consume this package

| Use case | Import from |
|---------|------------|
| Marketing copy, README, og-image text | `@nebutra/brand` (`positioning`, `brand` metadata) |
| Custom motion outside `AnimateIn` | `@nebutra/brand/motion` |
| Logo SVG components | `@nebutra/brand/components` |
| **Anything in app runtime CSS** | **NOT** this package — use `@nebutra/tokens` |

### 3.2 Custom motion (rare — prefer `AnimateIn`)

```tsx
import { motion } from "framer-motion";
import { emerge, brandEasing } from "@nebutra/brand/motion";

<motion.div {...emerge}>
  <CustomFadeInElement />
</motion.div>
```

Default to `<AnimateIn preset="emerge">` from `@nebutra/ui/components` for 99% of cases.

---

## 4. Imports & Conventions

```ts
import { brand, colors } from "@nebutra/brand";
import { positioning } from "@nebutra/brand/positioning";
import { emerge, flow, pulse, brandMotion } from "@nebutra/brand/motion";
```

### Forbidden in app runtime code

```tsx
// ❌ Importing brand color JS in app runtime — use CSS variables from @nebutra/tokens
import { colors } from "@nebutra/brand/guidelines/color";
<div style={{ color: colors.primary[500] }} />

// ✅ CORRECT — use the runtime CSS variable
<div style={{ color: "var(--brand-primary)" }} />
```

The `@nebutra/brand` JS exports exist for **build-time tooling** (Figma sync, generators, README copy) — not runtime styling.

---

## 5. Theming

This layer does not participate in light/dark or multi-theme switching. Brand colors are the **anchors**; `@nebutra/theme` derives perceptual variants from them.

---

## 6. Versioning & Governance

| Surface | Status |
|--------|--------|
| Brand colors `#0033FE` / `#0BF1C3` | **Locked** — change requires a brand-level RFC |
| Tagline (EN/CN) | **Locked** |
| Logo geometry | **Locked** |
| Gradient angle/stops | **Locked** |
| `positioning.pillars[]` | Extensible — must be backed by an actual package/app |
| `useCases[]` | Extensible — must reflect real demos in the repo |
| Motion easing curves | **Locked** |
| Spring presets | Extensible — additions allowed, no renames |

### Governance check

```bash
pnpm --filter @nebutra/brand typecheck
node scripts/check-legal-keys.js   # validates brand metadata immutability
```

---

## 7. Open questions / review notes

- The brand `guidelines/color.ts` accent scale and the runtime `@nebutra/tokens` cyan scale have slightly different intermediate steps. Decide whether to consolidate to a single source of derivation (likely: runtime tokens become canonical, regenerate `guidelines/color.ts` from them).
- Logo SVG components are in `packages/design/brand/src/components/` but lack Storybook stories — recommend adding to the Foundation/Logo group.

---

← back to [root DESIGN.md](../../DESIGN.md) ·
peer specs: [tokens](../tokens/DESIGN.md) · [theme](../theme/DESIGN.md) · [ui](../ui/DESIGN.md)
