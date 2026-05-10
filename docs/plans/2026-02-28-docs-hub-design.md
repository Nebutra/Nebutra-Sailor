# Design: docs-hub — Mintlify Design System Documentation Hub

**Date**: 2026-02-28
**Status**: Approved
**Author**: Product + Engineering

---

## Overview

Create `apps/docs-hub` as a Mintlify documentation app and migrate `packages/design-system` into it as a co-located sub-package. The result is a single source of truth: design system source code and its documentation live together, following Silicon Valley unicorn standards (Vercel / Stripe / Supabase quality bar).

---

## Design Principles

1. **来源唯一性** — All specs, components, and styles must originate from existing implementations. No new design language introduced.
2. **复用优先** — Existing atomic components are catalogued and promoted, not duplicated.
3. **抽象而非重构** — Abstract and constrain; do not mass-refactor. Old and new can co-exist; all new development follows the Design System.
4. **样式规范化** — Inline CSS eliminated via Design Tokens, Tailwind classes, or component Props. No inline CSS in Design System components.
5. **最小必要规范** — Only high-frequency, cross-page reusable UI is formalised.
6. **文档即规范** — The Mintlify docs site is the single authoritative spec. No parallel design docs or verbal conventions.

---

## Architecture

### Directory Structure

```
apps/docs-hub/
├── mint.json                          # Mintlify config + navigation
├── package.json                       # @nebutra/docs-hub (private)
│
├── introduction.mdx
├── how-to-use.mdx
├── contributing.mdx
│
├── foundations/
│   ├── accessibility.mdx
│   ├── color.mdx
│   ├── typography.mdx
│   ├── theming.mdx
│   ├── tailwind.mdx
│   ├── icons.mdx
│   └── copywriting.mdx
│
├── ui-patterns/
│   ├── introduction.mdx
│   ├── charts.mdx
│   ├── empty-states.mdx
│   ├── forms.mdx
│   ├── layout.mdx
│   ├── modality.mdx
│   ├── navigation.mdx
│   └── tables.mdx
│
├── fragment-components/
│   ├── introduction.mdx
│   ├── admonition.mdx
│   ├── assistant-chat.mdx
│   ├── confirmation-modal.mdx
│   ├── data-input.mdx
│   ├── empty-state.mdx
│   ├── filter-bar.mdx
│   ├── form-item-layout.mdx
│   ├── info-tooltip.mdx
│   ├── inner-side-menu.mdx
│   ├── logs-bar-chart.mdx
│   ├── metric-card.mdx
│   ├── modal.mdx
│   ├── multi-select.mdx
│   ├── page-container.mdx
│   ├── page-header.mdx
│   ├── page-section.mdx
│   ├── table-of-contents.mdx
│   └── text-confirm-dialog.mdx
│
├── atom-components/
│   ├── introduction.mdx
│   ├── accordion.mdx
│   ├── alert.mdx
│   ├── alert-dialog.mdx
│   ├── aspect-ratio.mdx
│   ├── avatar.mdx
│   ├── badge.mdx
│   ├── breadcrumb.mdx
│   ├── button.mdx
│   ├── calendar.mdx
│   ├── card.mdx
│   ├── carousel.mdx
│   ├── checkbox.mdx
│   ├── collapsible.mdx
│   ├── combobox.mdx
│   ├── command.mdx
│   ├── command-menu.mdx
│   ├── context-menu.mdx
│   ├── date-picker.mdx
│   ├── dialog.mdx
│   ├── drawer.mdx
│   ├── dropdown-menu.mdx
│   ├── expanding-textarea.mdx
│   ├── field.mdx
│   ├── form.mdx
│   ├── hover-card.mdx
│   ├── input.mdx
│   ├── input-otp.mdx
│   ├── label.mdx
│   ├── menubar.mdx
│   ├── mermaid.mdx
│   ├── nav-menu.mdx
│   ├── navigation-menu.mdx
│   ├── pagination.mdx
│   ├── popover.mdx
│   ├── progress.mdx
│   ├── radio-group.mdx
│   ├── radio-group-card.mdx
│   ├── radio-group-stacked.mdx
│   ├── resizable.mdx
│   ├── scroll-area.mdx
│   ├── select.mdx
│   ├── separator.mdx
│   ├── sheet.mdx
│   ├── sidebar.mdx
│   ├── skeleton.mdx
│   ├── slider.mdx
│   ├── sonner.mdx
│   ├── switch.mdx
│   ├── table.mdx
│   ├── tabs.mdx
│   ├── textarea.mdx
│   ├── toggle.mdx
│   ├── toggle-group.mdx
│   ├── tooltip.mdx
│   └── tree-view.mdx
│
└── design-system/                     # Migrated from packages/design-system
    ├── package.json                   # name: @nebutra/ui (unchanged)
    ├── tsconfig.json
    ├── tsup.config.ts
    └── src/
        ├── theme/
        ├── typography/
        ├── primitives/
        ├── components/
        ├── icons/
        ├── utils/
        ├── hooks/
        ├── governance/
        └── index.ts
```

---

## Workspace Changes

### pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "apps/docs-hub/*" # NEW: recognises nested design-system package
  - "packages/*"
  - "backends/python/*"
  - "backends/gateway"
```

### Consumer Impact

Zero changes required in:

- `apps/web/package.json`
- `apps/landing-page/package.json`
- `packages/ui/package.json`

All use `"@nebutra/ui": "workspace:*"` — pnpm resolves by package name, not physical path.

---

## Mintlify Configuration (mint.json)

```json
{
  "name": "Nebutra Design System",
  "logo": {
    "light": "/logo/light.svg",
    "dark": "/logo/dark.svg"
  },
  "favicon": "/favicon.svg",
  "colors": {
    "primary": "#0070F3",
    "light": "#3291FF",
    "dark": "#0761D1"
  },
  "navigation": [
    {
      "group": "Getting Started",
      "pages": ["introduction", "how-to-use", "contributing"]
    },
    {
      "group": "Foundations",
      "pages": [
        "foundations/accessibility",
        "foundations/color",
        "foundations/typography",
        "foundations/theming",
        "foundations/tailwind",
        "foundations/icons",
        "foundations/copywriting"
      ]
    },
    {
      "group": "UI Patterns",
      "pages": [
        "ui-patterns/introduction",
        "ui-patterns/charts",
        "ui-patterns/empty-states",
        "ui-patterns/forms",
        "ui-patterns/layout",
        "ui-patterns/modality",
        "ui-patterns/navigation",
        "ui-patterns/tables"
      ]
    },
    {
      "group": "Fragment Components",
      "pages": [
        "fragment-components/introduction",
        "fragment-components/admonition",
        "fragment-components/assistant-chat",
        "fragment-components/confirmation-modal",
        "fragment-components/data-input",
        "fragment-components/empty-state",
        "fragment-components/filter-bar",
        "fragment-components/form-item-layout",
        "fragment-components/info-tooltip",
        "fragment-components/inner-side-menu",
        "fragment-components/logs-bar-chart",
        "fragment-components/metric-card",
        "fragment-components/modal",
        "fragment-components/multi-select",
        "fragment-components/page-container",
        "fragment-components/page-header",
        "fragment-components/page-section",
        "fragment-components/table-of-contents",
        "fragment-components/text-confirm-dialog"
      ]
    },
    {
      "group": "Atom Components",
      "pages": [
        "atom-components/introduction",
        "atom-components/accordion",
        "atom-components/alert",
        "atom-components/alert-dialog",
        "atom-components/aspect-ratio",
        "atom-components/avatar",
        "atom-components/badge",
        "atom-components/breadcrumb",
        "atom-components/button",
        "atom-components/calendar",
        "atom-components/card",
        "atom-components/carousel",
        "atom-components/checkbox",
        "atom-components/collapsible",
        "atom-components/combobox",
        "atom-components/command",
        "atom-components/command-menu",
        "atom-components/context-menu",
        "atom-components/date-picker",
        "atom-components/dialog",
        "atom-components/drawer",
        "atom-components/dropdown-menu",
        "atom-components/expanding-textarea",
        "atom-components/field",
        "atom-components/form",
        "atom-components/hover-card",
        "atom-components/input",
        "atom-components/input-otp",
        "atom-components/label",
        "atom-components/menubar",
        "atom-components/mermaid",
        "atom-components/nav-menu",
        "atom-components/navigation-menu",
        "atom-components/pagination",
        "atom-components/popover",
        "atom-components/progress",
        "atom-components/radio-group",
        "atom-components/radio-group-card",
        "atom-components/radio-group-stacked",
        "atom-components/resizable",
        "atom-components/scroll-area",
        "atom-components/select",
        "atom-components/separator",
        "atom-components/sheet",
        "atom-components/sidebar",
        "atom-components/skeleton",
        "atom-components/slider",
        "atom-components/sonner",
        "atom-components/switch",
        "atom-components/table",
        "atom-components/tabs",
        "atom-components/textarea",
        "atom-components/toggle",
        "atom-components/toggle-group",
        "atom-components/tooltip",
        "atom-components/tree-view"
      ]
    }
  ]
}
```

---

## MDX Page Templates

### Foundations Page

```mdx
---
title: "Color"
description: "Color usage across the Nebutra design system."
---

## Overview

## Design Rationale

## Usage Guidelines

## Do / Don't
```

### Atom / Fragment Component Page

````mdx
---
title: "Button"
description: "Triggers an action or event."
---

## Demo

<ComponentPreview />

## Usage

```tsx
import { Button } from "@nebutra/ui";
```
````

## Props

<PropsTable />

## Examples

## Accessibility

````

### UI Pattern Page

```mdx
---
title: "Forms"
description: "Patterns for data collection and user input."
---

## When to Use

## Structure

## Composition

## Examples

## Related Components
````

---

## Content Strategy

All MDX content is extracted from existing implementations — **never invented**. Primary sources:

| Source                        | Content extracted                          |
| ----------------------------- | ------------------------------------------ |
| `packages/design-system/src/` | Tokens, theme, typography, base components |
| `packages/ui/`         | Atom and fragment components               |
| `packages/ui/`                | Shadcn/Radix primitives used in project    |
| `apps/web/src/`               | Real business usage patterns               |
| `apps/landing-page/src/`      | Marketing patterns                         |
| `docs/*.md`                   | Existing written specifications            |

---

## Quality Bar (Silicon Valley Unicorn Standard)

Reference sites: Vercel Docs, Stripe Docs, Supabase Docs, Linear Docs, Radix UI.

- Every component page has a live code example extracted from real usage
- Props tables are complete and typed
- Do/Don't callouts on all Foundations pages
- No marketing language in technical docs — precise, scannable, minimal
- Dark mode supported out of the box via Mintlify

---

## Implementation Phases

### Phase 1 — Scaffold & Migrate

- Create `apps/docs-hub/` directory
- Create `mint.json`, `package.json`
- Move `packages/design-system` → `apps/docs-hub/design-system/`
- Update `pnpm-workspace.yaml`
- Verify workspace linking (`pnpm install` + typecheck on all consumers)

### Phase 2 — MDX Skeleton

- Generate all MDX files with correct frontmatter and section headings
- Wire navigation in `mint.json`
- Verify Mintlify dev server renders correctly

### Phase 3 — Content Population (per section)

- Getting Started (3 pages)
- Foundations (7 pages) — extracted from `theme/`, `typography/`
- UI Patterns (8 pages) — extracted from app-level patterns
- Fragment Components (18 pages) — extracted from `ui/`, `ui/`
- Atom Components (45+ pages) — extracted from `ui/`, `ui/`

---

## Constraints

- ❌ No new visual styles not present in codebase
- ❌ No "improved" designs — document what exists
- ❌ No inline CSS in Design System components
- ❌ No overlapping component semantics
