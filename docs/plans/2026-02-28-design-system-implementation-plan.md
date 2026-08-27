Good -- no existing stories in the project source (only in node_modules), and no `tokens/components/` directory exists yet. I now have a complete picture of the codebase. Here is the comprehensive implementation plan.

---

# Implementation Plan: Design System Geist Quality Upgrade

## Overview

This plan upgrades the `@nebutra/ui` design system to Geist-level quality by establishing a 3-layer design token architecture, setting up Storybook for isolated development, adding interactive documentation components to `docs-hub`, and refining 5 core components (Button, Avatar, Input, Card, Badge) with strict sizing, new variants, and unified focus/transition behavior. The work spans 10 sequential phases across 3 packages.

## Requirements

- Establish a `primitive.ts` / `semantic.ts` / `components/*.ts` token hierarchy as the single source of truth
- Update `globals.css` and `tailwind.preset.ts` to consume the new tokens
- Create `apps/storybook` with `@storybook/react-vite` loading stories from `packages/ui`
- Write 5 component stories (button, avatar, input, card, badge)
- Add `ComponentPreview` and `PropsTable` MDX components to `apps/docs-hub`
- Refine Button: add outline variant (already exists but needs Geist treatment), loading prop, strict sizing, focus ring
- Refine Avatar + AvatarGroup: 5 sizes, Group with max prop, fallback chain
- Refine Input: prefix/suffix slots, clearable, error state
- Refine Card: padding variants, interactive prop, shadow scale
- Refine Badge: semantic color variants (success, warning, info), dot variant

## Current State Summary

| Aspect                 | Current State                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Tokens**             | 4 files (`spacing.ts`, `typography.ts`, `shadows.ts`, `motion.ts`) -- no primitive/semantic split, no component-level tokens    |
| **globals.css**        | HSL-based CSS variables, Tailwind CSS 4 `@theme inline` block, consistent but no unified transition/focus-ring tokens           |
| **tailwind.preset.ts** | Hardcoded hex values duplicating globals.css -- NOT consuming the token TS files                                                |
| **Button**             | Standard shadcn/ui, 4 sizes (`default`/`sm`/`lg`/`icon`), 6 variants including outline. Heights: 40/36/44/40px. No loading prop |
| **Avatar**             | Radix-based, single size (40px), no size variants, no AvatarGroup                                                               |
| **Input**              | Basic `<input>` wrapper, h-10, no prefix/suffix/clearable/error                                                                 |
| **Card**               | 6 sub-components (Card/Header/Title/Description/Content/Footer), fixed p-6, no padding/interactive variants                     |
| **Badge**              | CVA-based, 4 variants (`default`/`secondary`/`destructive`/`outline`), no semantic colors, no dot variant                       |
| **Storybook**          | Does not exist                                                                                                                  |
| **docs-hub**           | Mintlify-based MDX, static code blocks only, no ComponentPreview or PropsTable                                                  |

---

## Architecture Changes

```
packages/design/ui/src/tokens/
  primitive.ts          NEW  -- raw values (hex colors, px numbers, unitless scales)
  semantic.ts           NEW  -- light/dark mode CSS variable name mappings
  components/
    button.ts           NEW  -- button-specific token decisions
    avatar.ts           NEW  -- avatar-specific token decisions
    input.ts            NEW  -- input-specific token decisions
    card.ts             NEW  -- card-specific token decisions
    badge.ts            NEW  -- badge-specific token decisions
    index.ts            NEW  -- barrel export
  index.ts              MODIFY -- re-export new files

packages/design/ui/src/styles/globals.css     MODIFY -- add transition, focus-ring, border tokens
packages/design/ui/src/tailwind.preset.ts     MODIFY -- consume primitive.ts instead of hardcoded values

apps/storybook/                               NEW  -- entire directory
  .storybook/main.ts
  .storybook/preview.tsx
  package.json
  tsconfig.json

packages/design/ui/src/primitives/
  button.stories.tsx    NEW
  avatar.stories.tsx    NEW
  input.stories.tsx     NEW
  card.stories.tsx      NEW
  badge.stories.tsx     NEW
  button.tsx            MODIFY -- loading prop, strict sizing, focus ring
  avatar.tsx            MODIFY -- 5 sizes, AvatarGroup, fallback chain
  input.tsx             MODIFY -- prefix/suffix, clearable, error
  card.tsx              MODIFY -- padding variants, interactive
  badge.tsx             MODIFY -- semantic variants, dot variant

packages/design/ui/src/primitives/index.ts    MODIFY -- export new types/components

apps/docs-hub/
  snippets/ComponentPreview.mdx   NEW  -- or as custom component
  snippets/PropsTable.mdx         NEW
```

---

## Implementation Steps

### Phase 1: Token 3-Layer Architecture

**Goal:** Create the canonical token source files that every downstream consumer references.

**Dependencies:** None (foundation phase)

**Files to create:**

#### 1.1 `packages/design/ui/src/tokens/primitive.ts` (NEW)

```typescript
/**
 * Primitive Design Tokens - Layer 1
 *
 * Raw values only. No CSS variable references, no semantic meaning.
 * These are the "atoms" of the design system.
 */

// ─── Color Palette ───────────────────────────────────────────────────────────
export const primitiveColors = {
  // Nebutra Blue scale
  blue50: "#f0f4ff",
  blue100: "#dbe4ff",
  blue200: "#bac8ff",
  blue300: "#91a7ff",
  blue400: "#5c7cfa",
  blue500: "#0033FE",
  blue600: "#002ad4",
  blue700: "#0021ab",
  blue800: "#001882",
  blue900: "#000f59",
  blue950: "#000830",

  // Nebutra Cyan scale
  cyan50: "#e6fff8",
  cyan100: "#b3ffec",
  cyan200: "#80ffe0",
  cyan300: "#4dfcd4",
  cyan400: "#1af7c8",
  cyan500: "#0BF1C3",
  cyan600: "#09c9a3",
  cyan700: "#07a183",
  cyan800: "#057963",
  cyan900: "#035143",
  cyan950: "#012923",

  // Neutral scale (blue undertone)
  neutral50: "#f8fafc",
  neutral100: "#f1f5f9",
  neutral200: "#e2e8f0",
  neutral300: "#cbd5e1",
  neutral400: "#94a3b8",
  neutral500: "#64748b",
  neutral600: "#475569",
  neutral700: "#334155",
  neutral800: "#1e293b",
  neutral900: "#0f172a",
  neutral950: "#020617",

  // Semantic raw colors (per VI manual §Color Specifications)
  red500: "#ef4444",
  red600: "#dc2626",
  green500: "#22c55e", // VI manual specifies #22c55e for success
  green600: "#16a34a",
  amber500: "#f59e0b",
  amber600: "#d97706",
  // NOTE: info color = brand blue (#0033FE), NOT sky — per VI manual

  white: "#ffffff",
  black: "#000000",
} as const;

// ─── Brand Gradients (VI manual §Brand Gradients) ────────────────────────────
// These are first-class tokens. Primary gradient is the Nebutra signature mark.
export const primitiveGradients = {
  /** Hero, primary CTA buttons, logo fills */
  primary: "linear-gradient(135deg, #0033FE 0%, #0BF1C3 100%)",
  /** Hover states, secondary elements */
  reverse: "linear-gradient(135deg, #0BF1C3 0%, #0033FE 100%)",
  /** Vertical layout dividers, page sections */
  vertical: "linear-gradient(180deg, #0033FE 0%, #0BF1C3 100%)",
  /** Background halos, focus glow effects */
  radial: "radial-gradient(circle, #0BF1C3 0%, #0033FE 100%)",
  /** Subtle background tint for dark mode cards */
  darkCard: "linear-gradient(135deg, #020617 0%, #0a1628 100%)",
} as const;

export type PrimitiveGradient = keyof typeof primitiveGradients;

// ─── Spacing Scale ───────────────────────────────────────────────────────────
export const primitiveSpacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ─── Sizing Scale (component heights) ───────────────────────────────────────
export const primitiveSizing = {
  xs: 20,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
  "2xl": 80,
} as const;

// ─── Border Radius ───────────────────────────────────────────────────────────
export const primitiveRadius = {
  none: 0,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  full: 9999,
} as const;

// ─── Font Sizes ──────────────────────────────────────────────────────────────
export const primitiveFontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
  "4xl": 36,
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────
export const primitiveShadow = {
  none: "none",
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;

// ─── Transition ──────────────────────────────────────────────────────────────
export const primitiveTransition = {
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
  },
  easing: {
    default: "ease-out",
    spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
} as const;

// ─── Focus Ring ──────────────────────────────────────────────────────────────
export const primitiveFocusRing = {
  width: 2,
  offset: 2,
} as const;

// ─── Font Family (per VI manual §Typography) ─────────────────────────────────
// VI specifies Poppins as English primary, vivo Sans → PingFang SC for Chinese.
export const primitiveFontFamily = {
  /** English primary — Poppins (Regular 400 / Medium 500 / SemiBold 600) */
  sans: '"Poppins", "vivo Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", -apple-system, BlinkMacSystemFont, sans-serif',
  /** Chinese primary — vivo Sans with system fallbacks */
  cnSans:
    '"vivo Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  /** Display / hero text — Poppins only (no CJK needed for headlines) */
  display: '"Poppins", sans-serif',
  /** Code / monospace */
  mono: '"JetBrains Mono", "Fira Code", ui-monospace, Consolas, monospace',
} as const;

// ─── Types ───────────────────────────────────────────────────────────────────
export type PrimitiveColor = keyof typeof primitiveColors;
export type PrimitiveSpacing = keyof typeof primitiveSpacing;
export type PrimitiveSizing = keyof typeof primitiveSizing;
export type PrimitiveRadius = keyof typeof primitiveRadius;
export type PrimitiveFontSize = keyof typeof primitiveFontSize;
```

**Key design decision:** All values are raw numbers (px) or strings (hex). No `rem`, no CSS variables. Conversion to CSS happens in `semantic.ts` and `globals.css`.

---

#### 1.2 `packages/design/ui/src/tokens/semantic.ts` (NEW)

```typescript
/**
 * Semantic Design Tokens - Layer 2
 *
 * Maps primitive values to CSS variable names with light/dark mode awareness.
 * This file is the bridge between primitive.ts and globals.css.
 */
import {
  primitiveColors,
  primitiveGradients,
  primitiveRadius,
  primitiveTransition,
  primitiveFocusRing,
} from "./primitive";

export interface SemanticColorScale {
  readonly background: string;
  readonly foreground: string;
  readonly card: string;
  readonly cardForeground: string;
  readonly primary: string;
  readonly primaryForeground: string;
  readonly secondary: string;
  readonly secondaryForeground: string;
  readonly muted: string;
  readonly mutedForeground: string;
  readonly accent: string;
  readonly accentForeground: string;
  readonly destructive: string;
  readonly destructiveForeground: string;
  readonly success: string;
  readonly successForeground: string;
  readonly warning: string;
  readonly warningForeground: string;
  readonly info: string;
  readonly infoForeground: string;
  readonly border: string;
  readonly input: string;
  readonly ring: string;
}

export const semanticLight: SemanticColorScale = {
  // VI: White (#FFFFFF) is the canonical light background, not neutral-50
  background: primitiveColors.white,
  foreground: primitiveColors.neutral900,
  card: primitiveColors.white,
  cardForeground: primitiveColors.neutral900,
  // VI: Primary = 云毓蓝 #0033FE (Brand Blue)
  primary: primitiveColors.blue500,
  primaryForeground: primitiveColors.white,
  // VI: Secondary = 云毓青 #0BF1C3 (Brand Cyan)
  secondary: primitiveColors.cyan500,
  secondaryForeground: primitiveColors.neutral900,
  muted: primitiveColors.neutral100,
  mutedForeground: primitiveColors.neutral500,
  accent: primitiveColors.blue50,
  accentForeground: primitiveColors.blue500,
  destructive: primitiveColors.red500,
  destructiveForeground: primitiveColors.white,
  success: primitiveColors.green500, // #22c55e per VI manual
  successForeground: primitiveColors.white,
  warning: primitiveColors.amber500,
  warningForeground: primitiveColors.neutral900,
  info: primitiveColors.blue500, // VI: Info = brand blue, not sky
  infoForeground: primitiveColors.white,
  border: primitiveColors.neutral200,
  input: primitiveColors.neutral200,
  ring: primitiveColors.blue500, // Focus ring = brand blue
} as const;

export const semanticDark: SemanticColorScale = {
  // VI: Dark background uses deepest neutral with blue undertone
  background: primitiveColors.neutral950, // #020617
  foreground: primitiveColors.neutral50,
  card: primitiveColors.neutral900, // #0f172a
  cardForeground: primitiveColors.neutral50,
  primary: primitiveColors.blue400, // Lighter blue for dark contrast
  primaryForeground: primitiveColors.neutral950,
  secondary: primitiveColors.cyan400,
  secondaryForeground: primitiveColors.neutral950,
  muted: primitiveColors.neutral800,
  mutedForeground: primitiveColors.neutral400,
  accent: "#0a1628", // Deep brand-blue tinted surface
  accentForeground: primitiveColors.blue400,
  destructive: primitiveColors.red600,
  destructiveForeground: primitiveColors.neutral50,
  success: primitiveColors.green600,
  successForeground: primitiveColors.neutral50,
  warning: primitiveColors.amber600,
  warningForeground: primitiveColors.neutral50,
  info: primitiveColors.blue400, // Lighter brand blue for dark
  infoForeground: primitiveColors.neutral950,
  border: primitiveColors.neutral800,
  input: primitiveColors.neutral800,
  ring: primitiveColors.blue400,
} as const;

// ─── Gradient Semantic Tokens ─────────────────────────────────────────────────
// Consumed by Tailwind preset as CSS custom properties.
// VI: The Blue→Cyan gradient is Nebutra's most distinctive visual signature.
export const semanticGradients = {
  /** Primary CTA buttons, logo accents, hero sections */
  brand: primitiveGradients.primary,
  /** Hover state override for gradient buttons */
  brandHover: primitiveGradients.reverse,
  /** Page section dividers, feature highlight strips */
  section: primitiveGradients.vertical,
  /** Background glow effects, focus halos */
  glow: primitiveGradients.radial,
} as const;

/** Global refinements consumed by globals.css */
export const semanticGlobals = {
  defaultRadius: primitiveRadius.md, // 6px
  transitionDuration: primitiveTransition.duration.fast, // 150ms
  transitionEasing: primitiveTransition.easing.default, // ease-out
  focusRingWidth: primitiveFocusRing.width, // 2px
  focusRingOffset: primitiveFocusRing.offset, // 2px
  borderColor: "hsl(240 5.9% 90%)",
  // VI: Primary font is Poppins for English, vivo Sans for CN
  fontSans:
    '"Poppins", "vivo Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  fontCnSans:
    '"vivo Sans", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
  fontMono: '"JetBrains Mono", "Fira Code", ui-monospace, Consolas, monospace',
} as const;

export type SemanticTheme = "light" | "dark";
```

---

#### 1.3 `packages/design/ui/src/tokens/components/button.ts` (NEW)

```typescript
/**
 * Button Component Tokens - Layer 3
 */
import {
  primitiveSizing,
  primitiveSpacing,
  primitiveRadius,
  primitiveFontSize,
} from "../primitive";

export const buttonTokens = {
  size: {
    sm: {
      height: primitiveSizing.sm, // 32px
      paddingX: primitiveSpacing[3], // 12px
      borderRadius: primitiveRadius.sm, // 4px
      fontSize: primitiveFontSize.xs, // 12px
      iconSize: 14,
    },
    md: {
      height: primitiveSizing.md, // 40px
      paddingX: primitiveSpacing[4], // 16px
      borderRadius: primitiveRadius.md, // 6px
      fontSize: primitiveFontSize.sm, // 14px
      iconSize: 16,
    },
    lg: {
      height: primitiveSizing.lg, // 48px
      paddingX: primitiveSpacing[5], // 20px
      borderRadius: primitiveRadius.lg, // 8px
      fontSize: primitiveFontSize.base, // 16px
      iconSize: 18,
    },
    icon: {
      height: primitiveSizing.md, // 40px
      width: primitiveSizing.md, // 40px
      borderRadius: primitiveRadius.md, // 6px
    },
  },
  spinner: {
    sizeSm: 14,
    sizeMd: 16,
    sizeLg: 18,
  },
} as const;

export type ButtonSize = keyof typeof buttonTokens.size;
```

---

#### 1.4 `packages/design/ui/src/tokens/components/avatar.ts` (NEW)

```typescript
/**
 * Avatar Component Tokens - Layer 3
 */
import { primitiveSizing, primitiveFontSize } from "../primitive";

export const avatarTokens = {
  size: {
    xs: { dimension: primitiveSizing.xs, fontSize: 8, iconSize: 10 }, // 20px
    sm: {
      dimension: primitiveSizing.sm,
      fontSize: primitiveFontSize.xs,
      iconSize: 14,
    }, // 32px
    md: {
      dimension: primitiveSizing.md,
      fontSize: primitiveFontSize.sm,
      iconSize: 16,
    }, // 40px
    lg: { dimension: 56, fontSize: primitiveFontSize.xl, iconSize: 24 }, // 56px
    xl: { dimension: 80, fontSize: 28, iconSize: 32 }, // 80px
  },
  group: {
    overlapOffset: -8,
    maxBadgeSize: 24,
  },
} as const;

export type AvatarSize = keyof typeof avatarTokens.size;
```

---

#### 1.5 `packages/design/ui/src/tokens/components/input.ts` (NEW)

```typescript
/**
 * Input Component Tokens - Layer 3
 */
import {
  primitiveSizing,
  primitiveSpacing,
  primitiveRadius,
  primitiveFontSize,
} from "../primitive";

export const inputTokens = {
  height: primitiveSizing.md, // 40px locked
  paddingX: primitiveSpacing[3], // 12px
  borderRadius: primitiveRadius.md, // 6px
  fontSize: primitiveFontSize.sm, // 14px
  clearButtonSize: 16,
  prefixSuffixGap: primitiveSpacing[2], // 8px
} as const;
```

---

#### 1.6 `packages/design/ui/src/tokens/components/card.ts` (NEW)

```typescript
/**
 * Card Component Tokens - Layer 3
 */
import { primitiveSpacing, primitiveRadius } from "../primitive";

export const cardTokens = {
  padding: {
    sm: primitiveSpacing[4], // 16px
    md: primitiveSpacing[6], // 24px
    lg: primitiveSpacing[8], // 32px
  },
  borderRadius: primitiveRadius.lg, // 8px
  shadow: {
    default: "shadow-sm",
    hover: "shadow-md",
  },
} as const;

export type CardPadding = keyof typeof cardTokens.padding;
```

---

#### 1.7 `packages/design/ui/src/tokens/components/badge.ts` (NEW)

```typescript
/**
 * Badge Component Tokens - Layer 3
 */
import {
  primitiveFontSize,
  primitiveRadius,
  primitiveSpacing,
} from "../primitive";

export const badgeTokens = {
  fontSize: primitiveFontSize.xs, // 12px
  fontWeight: 500, // medium (not semibold)
  paddingX: primitiveSpacing[2], // 8px (adjusted from 10px for tighter)
  paddingY: 2, // 2px
  borderRadius: primitiveRadius.full, // pill
  dotSize: 6,
} as const;
```

---

#### 1.8 `packages/design/ui/src/tokens/components/index.ts` (NEW)

```typescript
export { buttonTokens, type ButtonSize } from "./button";
export { avatarTokens, type AvatarSize } from "./avatar";
export { inputTokens } from "./input";
export { cardTokens, type CardPadding } from "./card";
export { badgeTokens } from "./badge";
```

---

#### 1.9 Modify `packages/design/ui/src/tokens/index.ts`

**Action:** Add exports for the 3 new layers while keeping existing exports for backward compatibility.

```typescript
// --- NEW: 3-Layer Token Architecture ---
// Layer 1: Primitives
export * from './primitive'
// Layer 2: Semantic
export * from './semantic'
// Layer 3: Component tokens
export * from './components'

// --- EXISTING (preserved for backward compat) ---
export { spacing, semanticSpacing, containerWidths, ... } from './spacing'
export { fontSizes, fontWeights, ... } from './typography'
export { shadows, glowShadows, ... } from './shadows'
export { durations, easings, ... } from './motion'
```

**Risk:** LOW -- purely additive. Existing token exports remain unchanged.

---

### Phase 2: globals.css + tailwind.preset.ts Update

**Goal:** Update the CSS variable source and Tailwind preset to consume the new token values, adding the unified transition speed, focus ring, border color, and font stack improvements called out in the design doc.

**Dependencies:** Phase 1 (token files must exist)

#### 2.1 Modify `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/styles/globals.css`

**Changes to make:**

1. **`:root` section** -- Add new CSS variables:

   ```css
   /* Unified transition */
   --transition-duration: 150ms;
   --transition-easing: ease-out;
   --transition: var(--transition-duration) var(--transition-easing);

   /* Focus ring */
   --focus-ring: 0 0 0 2px hsl(var(--ring));
   --focus-ring-offset:
     0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring));

   /* Semantic colors (NEW) */
   --info: 199 89% 48%;
   --info-foreground: 0 0% 100%;
   ```

2. **Update `--radius`** from `0.5rem` to `0.375rem` (6px matches `primitiveRadius.md`). Actually, the current `--radius: 0.5rem` is 8px. The design doc says default radius is 6px. So change to:

   ```css
   --radius: 0.375rem; /* 6px - Geist default */
   ```

3. **Update border color** in the `*` rule:

   ```css
   * {
     border-color: hsl(240 5.9% 90%);
   }
   ```

4. **Add universal transition** to the base styles:

   ```css
   *,
   *::before,
   *::after {
     transition-property:
       color, background-color, border-color, box-shadow, opacity;
     transition-duration: var(--transition-duration);
     transition-timing-function: var(--transition-easing);
   }
   ```

5. **Update font stack** in `@theme inline`:

   ```css
   --font-sans:
     Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
   ```

6. **Add `.dark` section** equivalents for new variables (info/info-foreground).

7. **Add `@keyframes spinner`** for the Button loading state:
   ```css
   @keyframes spinner {
     to {
       transform: rotate(360deg);
     }
   }
   ```

#### 2.2 Modify `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/tailwind.preset.ts`

**Action:** Import from `./tokens/primitive` instead of hardcoding hex values.

```typescript
import {
  primitiveColors,
  primitiveSpacing,
  primitiveRadius,
  primitiveShadow,
  primitiveFontFamily,
  primitiveFontSize,
} from "./tokens/primitive";

// Convert numeric px to rem string
const pxToRem = (px: number): string => `${px / 16}rem`;

export const nebutraColors = {
  primary: {
    50: primitiveColors.blue50,
    // ...full scale
    DEFAULT: primitiveColors.blue500,
    foreground: primitiveColors.white,
  },
  // ... rest of colors referencing primitiveColors
} as const;
```

This makes `tailwind.preset.ts` a consumer of Layer 1 rather than a parallel source of truth.

**Risk:** MEDIUM -- changing the preset values could shift colors slightly in downstream apps that import it directly. Mitigation: The preset was already using different hex values than `globals.css` (e.g., preset had `#3B82F6` for primary but globals had `#0033FE`). The globals.css CSS variables are what actually control runtime colors; the preset is for programmatic access. We align both to the same source.

---

### Phase 3: Storybook App Setup

**Goal:** Create `apps/storybook` as a new workspace package with `@storybook/react-vite`.

**Dependencies:** Phase 2 (globals.css must be finalized so Storybook loads the correct styles)

#### 3.1 Create `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/apps/storybook/package.json` (NEW)

```json
{
  "name": "@nebutra/storybook",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "storybook dev -p 6006",
    "build": "storybook build -o dist",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "react": "^19.2.1",
    "react-dom": "^19.2.1",
    "@nebutra/ui": "workspace:*"
  },
  "devDependencies": {
    "@storybook/react": "^8.6.0",
    "@storybook/react-vite": "^8.6.0",
    "@storybook/addon-essentials": "^8.6.0",
    "@storybook/addon-a11y": "^8.6.0",
    "@storybook/addon-themes": "^8.6.0",
    "storybook": "^8.6.0",
    "typescript": "^5.6.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

#### 3.2 Create `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/apps/storybook/.storybook/main.ts` (NEW)

```typescript
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../../../packages/design/ui/src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-themes",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  viteFinal: async (config) => {
    // Ensure Tailwind CSS processes correctly
    return config;
  },
};

export default config;
```

#### 3.3 Create `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/apps/storybook/.storybook/preview.tsx` (NEW)

```tsx
import type { Preview } from "@storybook/react";
import { withThemeByClassName } from "@storybook/addon-themes";
import "@nebutra/ui/styles/globals.css";

const preview: Preview = {
  decorators: [
    withThemeByClassName({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
  ],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /date$/i } },
    layout: "centered",
  },
};

export default preview;
```

#### 3.4 Create `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/apps/storybook/tsconfig.json` (NEW)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "."
  },
  "include": [
    ".storybook/**/*",
    "../../packages/design/ui/src/**/*.stories.tsx"
  ],
  "exclude": ["node_modules", "dist"]
}
```

#### 3.5 Modify `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/turbo.json`

**Action:** The existing `build` and `dev` tasks should work for `apps/storybook` without changes because of the generic glob pattern. However, we should verify the `pnpm-workspace.yaml` already covers `apps/*` -- it does (line 2: `"apps/*"`). No change needed to either file.

**Risk:** MEDIUM -- Storybook 8.x + React 19 + Tailwind CSS 4 can have compatibility issues. Mitigation: Pin `@storybook/*` to a known working version (8.6.x); test `pnpm dev` early in Phase 3 with a minimal "hello world" story before proceeding.

---

### Phase 4: 5 Component Stories

**Goal:** Write rich `.stories.tsx` files for Button, Avatar, Input, Card, and Badge that cover all variants, sizes, states, and dark mode.

**Dependencies:** Phase 3 (Storybook must be running). These stories initially document the EXISTING component API; they will be updated again in Phases 6--10 as components are refined.

#### 4.1 `packages/design/ui/src/primitives/button.stories.tsx` (NEW)

```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "Primitives/Button",
  component: Button,
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"],
    },
    disabled: { control: "boolean" },
    // loading/loadingText will be added in Phase 6
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = { args: { children: "Button" } };
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};
export const AllSizes: Story = {
  /* sm, default, lg, icon */
};
export const Disabled: Story = {
  args: { children: "Disabled", disabled: true },
};
```

Patterns repeated for:

#### 4.2 `packages/design/ui/src/primitives/avatar.stories.tsx` (NEW)

Stories: Default, WithImage, WithFallback, Sizes (after Phase 7), Group (after Phase 7).

#### 4.3 `packages/design/ui/src/primitives/input.stories.tsx` (NEW)

Stories: Default, WithPlaceholder, Disabled, WithLabel. (Prefix/Suffix/Error/Clearable added in Phase 8.)

#### 4.4 `packages/design/ui/src/primitives/card.stories.tsx` (NEW)

Stories: Default, WithHeader, WithFooter, FullExample. (Padding/Interactive added in Phase 9.)

#### 4.5 `packages/design/ui/src/primitives/badge.stories.tsx` (NEW)

Stories: Default, AllVariants, WithIcon. (Semantic/Dot variants added in Phase 10.)

**Risk:** LOW -- stories are additive and do not affect component behavior.

---

### Phase 5: docs-hub ComponentPreview + PropsTable

**Goal:** Add two reusable MDX snippet components to the Mintlify docs site.

**Dependencies:** None (can run in parallel with Phase 4 if desired, but logically follows it).

**Important Mintlify constraint:** Mintlify supports custom components via `snippets/` directory as MDX fragments, or by using their built-in `<CodeGroup>`, `<Tabs>`, `<ResponseField>`, etc. For truly custom React components, Mintlify requires them in the `_components/` directory (as of v4+). We will use Mintlify's native capabilities combined with custom snippet patterns.

#### 5.1 `apps/docs-hub/snippets/ComponentPreview.mdx` (NEW)

Since Mintlify does not support arbitrary React component rendering (it is a static site generator that renders MDX server-side), the `ComponentPreview` will be implemented as an MDX pattern using Mintlify's `<CodeGroup>` + `<Tabs>` built-in components:

```mdx
{/_ ComponentPreview pattern: code block with "Preview" tab showing static image/screenshot
and "Code" tab showing the source _/}
```

Alternatively, if Mintlify v4 supports custom React components in `apps/docs-hub/_components/`, we create:

#### 5.1a `apps/docs-hub/_components/ComponentPreview.tsx` (NEW)

```tsx
"use client";

import { useState, type ReactNode } from "react";

interface ComponentPreviewProps {
  code: string;
  children: ReactNode;
}

export function ComponentPreview({ code, children }: ComponentPreviewProps) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Preview area */}
      <div className="p-6 flex items-center justify-center min-h-[120px] bg-background">
        {children}
      </div>
      {/* Toolbar */}
      <div className="flex items-center justify-between border-t border-border px-4 py-2 bg-muted/50">
        <button
          onClick={() => setShowCode(!showCode)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {showCode ? "Hide code" : "Show code"}
        </button>
        <button
          onClick={handleCopy}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {/* Code area (animated) */}
      {showCode && (
        <div className="border-t border-border">
          <pre className="p-4 text-sm overflow-x-auto">
            <code>{code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
```

#### 5.2 `apps/docs-hub/_components/PropsTable.tsx` (NEW)

```tsx
interface Prop {
  readonly name: string;
  readonly type: string;
  readonly default?: string;
  readonly description: string;
  readonly required?: boolean;
}

interface PropsTableProps {
  readonly props: readonly Prop[];
}

export function PropsTable({ props }: PropsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="pb-2 pr-4 font-medium">Prop</th>
            <th className="pb-2 pr-4 font-medium">Type</th>
            <th className="pb-2 pr-4 font-medium">Default</th>
            <th className="pb-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((prop) => (
            <tr key={prop.name} className="border-b border-border/50">
              <td className="py-2 pr-4">
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {prop.name}
                </code>
                {prop.required && (
                  <span className="text-destructive ml-1">*</span>
                )}
              </td>
              <td className="py-2 pr-4">
                <code className="text-xs text-muted-foreground">
                  {prop.type}
                </code>
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {prop.default ?? "---"}
              </td>
              <td className="py-2 text-muted-foreground">{prop.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Risk:** MEDIUM -- Mintlify's support for custom React components in `_components/` may require specific configuration. If it does not work, the fallback is to use Mintlify's native `<ResponseField>` for props tables and `<CodeGroup>` for code previews. The fallback approach is well-documented by Mintlify and requires no custom React.

**Fallback:** If custom components are not viable, update the 5 component MDX pages to use this pattern:

````mdx
<Tabs>
  <Tab title="Preview">
    <!-- static screenshot or iframe -->
  </Tab>
  <Tab title="Code">
    ```tsx
    // code here
    ```
  </Tab>
</Tabs>
````

And for PropsTable, use Mintlify's `<ResponseField>` or standard markdown tables (which already exist in the docs).

---

### Phase 6: Button Refinement

**Goal:** Upgrade Button to Geist-level quality with strict sizing from tokens, loading prop, and unified focus ring.

**Dependencies:** Phase 1 (button tokens), Phase 2 (globals.css focus ring variables)

#### 6.1 Modify `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/primitives/button.tsx`

**New interface:**

```typescript
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  readonly asChild?: boolean;
  readonly loading?: boolean;
  readonly loadingText?: string;
}
```

**Updated CVA definition:**

```typescript
const buttonVariants = cva(
  // Base: unified transition + focus ring from tokens
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "border border-transparent hover:border-border hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 rounded text-xs", // 32px, 12px padding, 4px radius, 12px font
        default: "h-10 px-4 rounded-md text-sm", // 40px, 16px padding, 6px radius, 14px font
        lg: "h-12 px-5 rounded-lg text-base", // 48px, 20px padding, 8px radius, 16px font
        icon: "h-10 w-10 rounded-md", // 40px square
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

**Key size changes from current:**

- `sm`: `h-9 px-3` (36px) --> `h-8 px-3` (32px)
- `default`: `h-10 px-4 py-2` (40px) --> `h-10 px-4` (40px, no py needed)
- `lg`: `h-11 px-8` (44px) --> `h-12 px-5` (48px, more balanced padding)

**Key variant changes:**

- `ghost`: Added `border border-transparent hover:border-border` per design doc spec
- Base class: Added `gap-2` for icon+text spacing, `transition-all duration-150 ease-out` for unified transition

**Loading implementation:**

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {loadingText ?? children}
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
```

#### 6.2 Update exports in `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/primitives/index.ts`

No change needed -- `ButtonProps` is already exported and the interface extension is backward compatible.

#### 6.3 Update `button.stories.tsx` -- add `Loading` and `LoadingText` stories

**Risk:** LOW-MEDIUM -- The size changes (sm from 36->32, lg from 44->48) will affect existing layouts. Mitigation: These are the Geist-standard sizes and the design doc explicitly calls for them. Any consumers using `size="sm"` or `size="lg"` will see slightly different heights.

---

### Phase 7: Avatar + AvatarGroup Refinement

**Goal:** Add 5 size variants, AvatarGroup component, and fallback chain.

**Dependencies:** Phase 1 (avatar tokens)

#### 7.1 Modify `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/primitives/avatar.tsx`

**New types:**

```typescript
import { cva, type VariantProps } from "class-variance-authority";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-5 w-5", // 20px
        sm: "h-8 w-8", // 32px
        md: "h-10 w-10", // 40px
        lg: "h-14 w-14", // 56px
        xl: "h-20 w-20", // 80px
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const avatarFallbackFontVariants = cva(
  "flex h-full w-full items-center justify-center rounded-full bg-muted font-medium",
  {
    variants: {
      size: {
        xs: "text-[8px]",
        sm: "text-xs",
        md: "text-sm",
        lg: "text-xl",
        xl: "text-[28px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);
```

**Updated Avatar interface:**

```typescript
export interface AvatarProps
  extends
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {}
```

**New AvatarGroup component:**

```typescript
export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly max?: number
  readonly size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

function AvatarGroup({ children, max, size = 'md', className, ...props }: AvatarGroupProps) {
  const childArray = React.Children.toArray(children)
  const visible = max ? childArray.slice(0, max) : childArray
  const overflow = max ? childArray.length - max : 0

  return (
    <div className={cn('flex -space-x-2', className)} {...props}>
      {visible.map((child, i) => (
        <div key={i} className="ring-2 ring-background rounded-full">
          {React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<AvatarProps>, { size })
            : child}
        </div>
      ))}
      {overflow > 0 && (
        <div className={cn(
          avatarVariants({ size }),
          'flex items-center justify-center bg-muted text-muted-foreground ring-2 ring-background text-xs font-medium'
        )}>
          +{overflow}
        </div>
      )}
    </div>
  )
}
```

**Fallback chain:** The existing Radix AvatarImage/AvatarFallback already handles image -> fallback. We enhance `AvatarFallback` to accept a `fallbackType` prop:

```typescript
export interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<
  typeof AvatarPrimitive.Fallback
> {
  readonly size?: "xs" | "sm" | "md" | "lg" | "xl";
}
```

When no `children` is provided to AvatarFallback, render a generic user icon (from `lucide-react`).

#### 7.2 Update exports in `index.ts`

Add: `AvatarGroup`, `AvatarGroupProps`, `AvatarProps`, `AvatarFallbackProps`.

#### 7.3 Update `avatar.stories.tsx`

Add: `AllSizes`, `WithGroup`, `GroupWithMax`, `FallbackChain` stories.

**Risk:** MEDIUM -- Changing Avatar's base class from hardcoded `h-10 w-10` to CVA variants means existing Avatar usages without a `size` prop will get the `md` default (same 40px). But any usage that overrode size via `className` may conflict with the variant class. Mitigation: `cn()` with `tailwind-merge` handles class deduplication.

---

### Phase 8: Input Refinement

**Goal:** Add prefix/suffix slots, clearable prop, and error state.

**Dependencies:** Phase 1 (input tokens), Phase 2 (destructive/ring CSS variables)

#### 8.1 Modify `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/primitives/input.tsx`

**New interface:**

```typescript
export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "prefix"
> {
  readonly prefix?: React.ReactNode;
  readonly suffix?: React.ReactNode;
  readonly clearable?: boolean;
  readonly error?: string;
  readonly onClear?: () => void;
}
```

**Implementation approach:** Wrap the `<input>` in a container `<div>` that provides the border, focus ring, and houses prefix/suffix. The `<input>` itself becomes borderless.

```tsx
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, type, prefix, suffix, clearable, error, onClear, ...props },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      props.value ?? props.defaultValue ?? "",
    );

    const handleClear = () => {
      setInternalValue("");
      onClear?.();
    };

    const showClear = clearable && String(internalValue).length > 0;

    return (
      <div
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md border bg-background px-3 text-sm transition-all duration-150 ease-out",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background",
          error
            ? "border-destructive focus-within:ring-destructive"
            : "border-input",
          props.disabled && "cursor-not-allowed opacity-50",
          className,
        )}
      >
        {prefix && (
          <span className="text-muted-foreground shrink-0">{prefix}</span>
        )}
        <input
          type={type}
          className="flex-1 bg-transparent placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed file:border-0 file:bg-transparent file:text-sm file:font-medium"
          ref={ref}
          onChange={(e) => {
            setInternalValue(e.target.value);
            props.onChange?.(e);
          }}
          {...props}
        />
        {showClear && (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Clear input"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {suffix && (
          <span className="text-muted-foreground shrink-0">{suffix}</span>
        )}
      </div>
    );
  },
);
```

**Error message display:** The `error` prop adds the red border. The actual error message text rendering is left to the consuming form layout (e.g., a `<FormField>` wrapper), consistent with shadcn/ui patterns. However, we add `aria-invalid={!!error}` and `aria-describedby` if an error ID is provided.

#### 8.2 Update `input.stories.tsx`

Add: `WithPrefix`, `WithSuffix`, `WithPrefixAndSuffix`, `Clearable`, `ErrorState` stories.

**Risk:** HIGH -- This is a breaking change. The current `Input` renders a bare `<input>` element. The new version wraps it in a `<div>`. Any consumer code that expects `Input` to be an `<input>` element (e.g., for CSS selectors like `input.some-class`, or direct `HTMLInputElement` event handling) could break. Mitigation:

1. The `ref` still forwards to the inner `<input>`, so `ref.current` remains an `HTMLInputElement`.
2. Most consumers use `Input` through composition, not direct CSS targeting.
3. We can export a `SimpleInput` alias that preserves the old behavior if needed.

---

### Phase 9: Card Refinement

**Goal:** Add padding variants, interactive prop, and shadow scale.

**Dependencies:** Phase 1 (card tokens)

#### 9.1 Modify `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/primitives/card.tsx`

**New interface for Card:**

```typescript
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly interactive?: boolean;
  readonly padding?: "sm" | "md" | "lg";
}
```

**Updated Card implementation:**

```typescript
import { cva, type VariantProps } from 'class-variance-authority'

const cardVariants = cva(
  'rounded-lg border border-border bg-card text-card-foreground shadow-sm transition-all duration-150 ease-out',
  {
    variants: {
      padding: {
        sm: '',   // padding applied to CardHeader/Content/Footer children
        md: '',
        lg: '',
      },
      interactive: {
        true: 'cursor-pointer hover:border-primary/50 hover:shadow-md',
        false: '',
      },
    },
    defaultVariants: {
      padding: 'md',
      interactive: false,
    },
  }
)

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, padding = 'md', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ interactive, padding, className }))}
      data-padding={padding}
      {...props}
    />
  )
)
```

**Padding propagation:** Use a CSS `data-padding` attribute on Card and target children:

```typescript
// CardHeader, CardContent, CardFooter use data-padding from parent
const paddingMap = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
} as const

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col space-y-1.5',
        // Default to p-6, can be overridden by parent's data-padding via CSS
        // Since we can't read parent props, we keep p-6 default and let className override
        'p-6 [.group[data-padding="sm"]_&]:p-4 [.group[data-padding="lg"]_&]:p-8',
        className
      )}
      {...props}
    />
  )
)
```

Actually, this CSS selector approach is fragile. A simpler approach: Use React Context.

```typescript
const CardPaddingContext = React.createContext<'sm' | 'md' | 'lg'>('md')

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, padding = 'md', children, ...props }, ref) => (
    <CardPaddingContext.Provider value={padding}>
      <div
        ref={ref}
        className={cn(cardVariants({ interactive, className }))}
        {...props}
      >
        {children}
      </div>
    </CardPaddingContext.Provider>
  )
)

// In CardHeader, CardContent, CardFooter:
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const padding = React.useContext(CardPaddingContext)
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5', paddingMap[padding], className)}
        {...props}
      />
    )
  }
)
```

#### 9.2 Update `card.stories.tsx`

Add: `PaddingSm`, `PaddingLg`, `Interactive`, `InteractiveHover` stories.

**Risk:** LOW -- The `padding` and `interactive` props are purely additive. Default behavior (`padding="md"` = `p-6`, `interactive=false`) matches the current implementation exactly. The only structural change is wrapping children in a `CardPaddingContext.Provider`, which is invisible to consumers.

---

### Phase 10: Badge Refinement

**Goal:** Add semantic color variants (success, warning, info) and a dot variant.

**Dependencies:** Phase 1 (badge tokens), Phase 2 (CSS variables for success/warning/info)

#### 10.1 Modify `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/packages/design/ui/src/primitives/badge.tsx`

**Updated CVA:**

```typescript
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        // Existing (preserved)
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",

        // NEW semantic variants
        success: "border-transparent bg-success text-success-foreground",
        warning: "border-transparent bg-warning text-warning-foreground",
        info: "border-transparent bg-info text-info-foreground",

        // NEW dot variant (styled differently)
        dot: "border-transparent bg-muted text-foreground gap-1.5 pl-2",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
```

**Updated interface:**

```typescript
export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  /** Color of the dot indicator (only used with variant="dot") */
  readonly dotColor?:
    | "default"
    | "success"
    | "warning"
    | "destructive"
    | "info";
}
```

**Dot variant rendering:**

```typescript
function Badge({ className, variant, dotColor = 'default', children, ...props }: BadgeProps) {
  const dotColorMap = {
    default:     'bg-primary',
    success:     'bg-success',
    warning:     'bg-warning',
    destructive: 'bg-destructive',
    info:        'bg-info',
  } as const

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {variant === 'dot' && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', dotColorMap[dotColor])}
          aria-hidden="true"
        />
      )}
      {children}
    </div>
  )
}
```

**Font weight change:** `font-semibold` (600) --> `font-medium` (500) per design doc spec.

#### 10.2 Update `badge.stories.tsx`

Add: `SemanticVariants`, `DotVariant`, `DotWithColors` stories.

#### 10.3 Verify CSS variables exist

The `success`, `warning` variables already exist in `globals.css`. We need to confirm `info` was added in Phase 2 (it will be). The Tailwind `@theme inline` block needs:

```css
--color-info: hsl(var(--info));
--color-info-foreground: hsl(var(--info-foreground));
```

**Risk:** LOW -- All existing variants are preserved. New variants are additive. The only potentially breaking change is `font-semibold` -> `font-medium`, which makes badges slightly thinner text. This is intentional per the design doc.

---

## Testing Strategy

### Unit Tests

For each refined component, write tests in `packages/design/ui/src/primitives/__tests__/`:

- `
