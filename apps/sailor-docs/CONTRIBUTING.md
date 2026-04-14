# Contributing to Nebutra Design Docs

This guide covers everything you need to contribute to the Nebutra design system documentation site
— built with [Fumadocs](https://fumadocs.vercel.app/) and Next.js 16.

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Adding a New Component Page](#adding-a-new-component-page)
- [Demo File Guidelines](#demo-file-guidelines)
- [MDX Content Guidelines](#mdx-content-guidelines)
- [Frontmatter Reference](#frontmatter-reference)
- [Component Lifecycle and Status](#component-lifecycle-and-status)
- [Internationalization](#internationalization)
- [PR Checklist](#pr-checklist)

---

## Overview

`apps/design-docs` is the internal documentation site for the Nebutra component library
(`@nebutra/ui`). It serves as the reference for designers, engineers, and consumers of the design
system.

### How documentation works

```
content/docs/en/components/button.mdx   ← MDX source (English)
content/docs/zh/components/button.mdx   ← MDX source (Chinese mirror)
src/components/previews/button-demo.tsx ← Interactive demo component
src/__registry__/index.tsx              ← Auto-generated registry (do not edit)
public/r/button-demo.json               ← shadcn-compatible registry entry
```

The `<ComponentPreview>` MDX component loads demo files from the registry at runtime. The registry
is generated automatically by `scripts/build-registry.mjs` — you do not edit it by hand.

---

## Quick Start

**Prerequisites:** Node.js 20+, pnpm 9+

```bash
# From the monorepo root
pnpm install

# Build the registry (required once before first run, then runs automatically)
node apps/design-docs/scripts/build-registry.mjs

# Start the dev server
pnpm --filter @nebutra/design-docs dev
```

The site runs at `http://localhost:3000` by default.

The registry rebuild runs automatically as part of `next dev` and `next build` via the `prebuild`
and `predev` scripts. You only need to run it manually when adding new demo exports outside of a dev
session.

---

## Adding a New Component Page

Follow these five steps in order.

### Step 1 — Create the demo file

Create `src/components/previews/{component}-demo.tsx`. Use kebab-case for the filename.

```tsx
// src/components/previews/tooltip-demo.tsx
"use client"

import { Tooltip, TooltipTrigger, TooltipContent } from "@nebutra/ui/primitives"
import { Button } from "@nebutra/ui/primitives"

export function TooltipDemo() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>Helpful context</TooltipContent>
    </Tooltip>
  )
}
```

For components with multiple variants, export additional named functions from the same file:

```tsx
export function TooltipDemo() { ... }
export function TooltipSideDemo() { ... }
export function TooltipInstantDemo() { ... }
```

Each named export becomes its own registry entry: `tooltip-demo`, `tooltip-side-demo`,
`tooltip-instant-demo`.

### Step 2 — Rebuild the registry

```bash
node apps/design-docs/scripts/build-registry.mjs
```

This scans all `src/components/previews/*.tsx` files, extracts exported component names, and
regenerates `src/__registry__/index.tsx`. The script also emits `public/r/{name}.json` entries for
shadcn CLI compatibility.

You can verify your demo was picked up:

```bash
grep "tooltip-demo" apps/design-docs/src/__registry__/index.tsx
```

### Step 3 — Create the MDX file

Create `content/docs/en/components/{component}.mdx`. See
[MDX Content Guidelines](#mdx-content-guidelines) for the full structure.

````mdx
---
title: Tooltip
description: Floating label that appears on hover or focus, providing contextual information.
status: stable
---

<ComponentPreview name="tooltip-demo" />

## Installation

```tsx
import { Tooltip, TooltipTrigger, TooltipContent } from "@nebutra/ui/primitives"
```
````

## Variants

...

## Props

<TypeTable type={{
    side: {
      description: 'Preferred side for the tooltip',
      type: '"top" | "right" | "bottom" | "left"',
      default: '"top"',
    },
  }} />

````

### Step 4 — Mirror the MDX file in Chinese

Copy the English file to `content/docs/zh/components/{component}.mdx` and translate the prose. See [Internationalization](#internationalization) for sync rules.

### Step 5 — Register the page in meta.json

Add the component name (without `.mdx`) to `content/docs/en/components/meta.json` and the corresponding `content/docs/zh/components/meta.json`. Insert it in the correct section (`Primitives`, `Patterns`, or `Marketing`).

```json
{
  "title": "Components",
  "pages": [
    "--- Primitives ---",
    "accordion",
    "tooltip"
  ]
}
````

Both `en` and `zh` meta files must stay in sync.

---

## Demo File Guidelines

### Naming conventions

| Thing             | Convention                       | Example                   |
| ----------------- | -------------------------------- | ------------------------- |
| Filename          | `{component}-{variant}-demo.tsx` | `button-loading-demo.tsx` |
| Primary export    | `{Component}Demo`                | `ButtonLoadingDemo`       |
| Secondary exports | `{Component}{Variant}Demo`       | `ButtonSizesDemo`         |
| Registry key      | kebab-case of export name        | `button-sizes-demo`       |

### Required imports

Always use these import paths — never import from internal package paths directly.

```tsx
// UI primitives (Radix + Nebutra wrappers)
import { Button, Input, Card } from "@nebutra/ui/primitives"

// Neist icons (preferred for interface actions)
import { Search, Settings } from "@nebutra/icons"

// Lucide icons (for generic or illustrative icons only)
import { ChevronRight, ExternalLink } from "lucide-react"

// Class merging
import { cn } from "@nebutra/ui/utils"

// Entrance animations
import { AnimateIn } from "@nebutra/ui/components"
```

### What makes a good demo

- **Show the default first.** The top demo should demonstrate the most common use case with no
  configuration.
- **Keep demos self-contained.** Each demo file should work in isolation — no shared state across
  exports.
- **Use realistic content.** Avoid `Lorem ipsum` or `foo`/`bar` placeholders. Use plausible names,
  labels, and data.
- **Demonstrate the surface, not all edge cases.** Edge cases belong in tests, not docs.
- **Add `"use client"` when needed.** Required for any component using state, effects, or browser
  APIs.

### Do / Don't

```tsx
// DO: Show the default variant prominently
export function ButtonDemo() {
  return (
    <div className="gap-3 flex flex-wrap">
      <Button variant="default">Save changes</Button>
      <Button variant="outline">Cancel</Button>
    </div>
  )
}

// DON'T: Use abstract placeholder content
export function ButtonDemo() {
  return <Button>Click me</Button>
}
```

```tsx
// DO: Separate concerns into focused named exports
export function InputDemo() { ... }
export function InputErrorDemo() { ... }
export function InputClearableDemo() { ... }

// DON'T: Cram all variants into a single monolithic demo
export function InputDemo() {
  return (
    <>
      {/* 80 lines of every possible input state */}
    </>
  );
}
```

```tsx
// DO: Use semantic CSS variable tokens for any custom styling
<div className="bg-[var(--neutral-2)] border-[var(--neutral-7)]">

// DON'T: Use arbitrary hex values or raw Tailwind colors for brand colors
<div style={{ backgroundColor: "#f8fafc" }}>
```

### Browser-only components

If your demo uses a browser-only API (canvas, `window`, WebGL, etc.), add the demo name to the
`SSR_EXCLUDE` set in `scripts/build-registry.mjs`. This causes the registry to emit `ssr: false` for
that entry.

---

## MDX Content Guidelines

### Standard page structure

Every component page should follow this order:

1. **Hero preview** — `<ComponentPreview name="{component}-demo" />` at the top, no heading
2. **Installation** — `## Installation` with the import statement
3. **Variants** — `## Variants` (if the component has visual variants)
4. **Additional demos** — grouped by concept (`## Sizes`, `## With Icons`, `## Loading State`)
5. **Props** — `## Props` with `<TypeTable>` or a Markdown table

### Available MDX components

| Component                                       | Purpose                                |
| ----------------------------------------------- | -------------------------------------- |
| `<ComponentPreview name="..." className="...">` | Renders a live demo with code tab      |
| `<TypeTable type={{...}} />`                    | Renders a prop reference table         |
| `<Callout type="info">`                         | Info, warning, or danger callout block |
| `<Steps>` / `<Step>`                            | Numbered step sequences                |
| `<Tab>` / `<Tabs>`                              | Tabbed content blocks                  |

### Writing good descriptions

The `description` frontmatter field and prose introductions should:

- Be one sentence, under 120 characters
- Start with a noun phrase describing what the component is, not what it does: "Collapsible content
  sections…" not "Use this to collapse…"
- Avoid marketing language: no "powerful", "flexible", "robust"
- Be specific about the primary behavior

```yaml
# Good
description: Collapsible content sections for progressively disclosing information.
description: Date picker built on React Aria with range, multi-month, and unavailable date support.

# Bad
description: A powerful and flexible accordion component for your app.
description: Use this to let users pick dates.
```

### Code blocks inside `<ComponentPreview>`

The code tab in a `<ComponentPreview>` block is populated from the source file automatically at
build time via `lib/remark-component.ts`. You do not need to duplicate the demo code as a fenced
code block inside the MDX unless you want to show a different snippet (e.g. the import only).

---

## Frontmatter Reference

| Field         | Type                                                   | Required | Description                                                  |
| ------------- | ------------------------------------------------------ | -------- | ------------------------------------------------------------ |
| `title`       | `string`                                               | Yes      | Component display name. Shown in sidebar and page heading.   |
| `description` | `string`                                               | Yes      | One-sentence summary. Shown in search results and meta tags. |
| `status`      | `"stable" \| "beta" \| "deprecated" \| "experimental"` | Yes      | Lifecycle status badge shown on the page.                    |
| `figma`       | `string` (URL)                                         | No       | Direct link to the Figma frame for this component.           |

Example:

```yaml
---
title: Date Picker
description:
  Date and date-range selection built on React Aria with keyboard and screen reader support.
status: stable
figma: https://www.figma.com/design/abc123/Nebutra?node-id=42%3A1
---
```

---

## Component Lifecycle and Status

### Status definitions

| Status         | Meaning                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------- |
| `experimental` | Early concept. API is unstable. Do not use in production. Breaking changes happen without warning. |
| `beta`         | API is mostly settled but may change. Feedback actively sought. Safe for non-critical paths.       |
| `stable`       | API is stable. Breaking changes follow semver major versioning. Ready for production.              |
| `deprecated`   | Will be removed in a future major version. Migration path documented on the page.                  |

### Promoting from beta to stable

Before changing a component's status to `stable`:

- [ ] No known accessibility gaps (keyboard nav, screen reader, color contrast)
- [ ] All common use-case variants are documented
- [ ] Props table is complete
- [ ] Figma frame linked (if applicable)
- [ ] At least one usage in a production Nebutra app
- [ ] No open API design issues in the component's GitHub discussions

### Deprecation process

1. Change `status` to `deprecated`
2. Add a `<Callout type="warning">` at the top of the MDX page explaining the replacement
3. Keep the page live for at least one major version after the deprecation announcement
4. Remove the page and registry entry only after the breaking major release

---

## Internationalization

The `content/docs/en/` tree is the source of truth. The `content/docs/zh/` tree is a mirror.

### Sync rules

- Every `.mdx` file in `en/` must have a corresponding file in `zh/` at the same relative path.
- The file structure (headings, component names, code blocks, MDX component usage) must be identical
  between `en` and `zh`. Only the human-readable prose is translated.
- Frontmatter fields `title`, `description` are translated. `status` and `figma` are copied
  verbatim.
- Code blocks are never translated — keep them byte-for-byte identical.
- `meta.json` in both locales must have identical `pages` arrays.

### When you add or rename a page

1. Create/rename the `en` file.
2. Create/rename the `zh` file with translated prose.
3. Update `meta.json` in both `en` and `zh`.

If you do not know Chinese, create the `zh` file as a copy of the `en` file and add the label
`<!-- i18n: needs-translation -->` at the top. A maintainer will handle the translation before
merge.

---

## PR Checklist

Before opening a pull request, verify:

### Demo file

- [ ] Filename follows `{component}-demo.tsx` kebab-case convention
- [ ] All exports follow `{Component}Demo` PascalCase convention
- [ ] Imports use `@nebutra/ui/primitives`, `@nebutra/icons`, and `lucide-react` — no internal paths
- [ ] No `console.log` statements
- [ ] No hardcoded hex colors or pixel values for brand tokens
- [ ] `"use client"` directive present if the demo uses state or browser APIs
- [ ] Registry rebuilt and new entry is visible in `src/__registry__/index.tsx`

### MDX content

- [ ] Frontmatter includes `title`, `description`, and `status`
- [ ] Page follows the standard structure: preview → installation → variants → props
- [ ] Description is one sentence, under 120 characters, noun-phrase style
- [ ] `<TypeTable>` or Markdown prop table covers all public props
- [ ] `figma` field added if a Figma frame exists

### Internationalization

- [ ] `zh` mirror file created or updated
- [ ] `meta.json` updated in both `en` and `zh`
- [ ] If translation is pending, `<!-- i18n: needs-translation -->` comment added to the `zh` file

### General

- [ ] `pnpm --filter @nebutra/design-docs build` passes without errors
- [ ] No TypeScript errors in demo files (`pnpm --filter @nebutra/design-docs typecheck`)
- [ ] Component renders correctly in light and dark mode
- [ ] Component is keyboard navigable (tab through interactive elements manually)
