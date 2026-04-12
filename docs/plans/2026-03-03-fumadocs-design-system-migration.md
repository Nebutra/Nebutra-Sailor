# Fumadocs Design System Docs Migration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate design system component documentation from Mintlify (static code blocks, no live preview) to a new Fumadocs app (`apps/design-docs`) that renders `@nebutra/ui` components inline.

**Architecture:** New `apps/design-docs` is a standalone Next.js 16 App Router app using `fumadocs-ui` + `fumadocs-mdx`. It imports `@nebutra/ui` as a workspace dependency via `transpilePackages`, so components render live without a separate build step. A `ComponentPreview` wrapper renders each demo in a Preview tab alongside a Code tab. `apps/docs-hub` (Mintlify) is retained but stripped of all design-system pages — it becomes the product docs hub (user manuals, API specs, Q&A only).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, `fumadocs-ui@14`, `fumadocs-core`, `fumadocs-mdx`, `@nebutra/ui` (workspace:*), pnpm, Turborepo

---

## Context

### Monorepo layout
- Root: `/Users/tseka_luk/Documents/Nebutra-SaaS-Lab/Nebutra-Sailor/`
- Workspace packages: `apps/*`, `packages/*`, `services/*`
- Package manager: pnpm 10 + Turborepo 2
- `apps/docs-hub/` — current Mintlify docs (to be trimmed, not deleted)
- `packages/ui/` → `@nebutra/ui` — component library (tsup-built, dist/)
- `apps/storybook/` — Storybook 8 (unchanged)

### Content to migrate (from `apps/docs-hub/design-system/`)
- `atom-components/` — ~145 MDX files (component API docs)
- `fragment-components/` — ~19 MDX files
- `foundations/` — ~15 MDX files
- `ui-patterns/` — ~8 MDX files
- `tooling/` — ~1 MDX file
- Top-level: `introduction.mdx`, `how-to-use.mdx`, `contributing.mdx`

### What stays in Mintlify (`apps/docs-hub`)
After migration, Mintlify retains only: product user manual, API reference, Q&A, Changelog, onboarding guides. All `design-system/` content moves to the new app.

---

## Phase 1 — Bootstrap `apps/design-docs`

### Task 1: Create the app directory and package.json

**Files:**
- Create: `apps/design-docs/package.json`

**Step 1: Create the directory**

```bash
mkdir -p /path/to/repo/apps/design-docs
```

**Step 2: Write package.json**

```json
{
  "name": "@nebutra/design-docs",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3003 --turbopack",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf .next"
  },
  "dependencies": {
    "@nebutra/ui": "workspace:*",
    "fumadocs-core": "^14.0.0",
    "fumadocs-mdx": "^11.0.0",
    "fumadocs-ui": "^14.0.0",
    "next": "^16.0.7",
    "react": "^19.2.1",
    "react-dom": "^19.2.1"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "typescript": "^5.9.3"
  }
}
```

**Step 3: Install from repo root**

```bash
pnpm install
```

Expected: pnpm resolves workspace deps, creates `apps/design-docs/node_modules`.

**Step 4: Commit**

```bash
git add apps/design-docs/package.json pnpm-lock.yaml
git commit -m "feat(design-docs): init Fumadocs app package"
```

---

### Task 2: TypeScript config

**Files:**
- Create: `apps/design-docs/tsconfig.json`

**Step 1: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**Step 2: Commit**

```bash
git add apps/design-docs/tsconfig.json
git commit -m "feat(design-docs): add tsconfig"
```

---

### Task 3: Fumadocs MDX source config

**Files:**
- Create: `apps/design-docs/source.config.ts`

This tells fumadocs-mdx where to find MDX files and how to build the navigation tree.

**Step 1: Write source.config.ts**

```ts
import { defineDocs, defineConfig } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
});

export default defineConfig({
  mdxOptions: {
    // remark / rehype plugins can be added here later
  },
});
```

**Step 2: Commit**

```bash
git add apps/design-docs/source.config.ts
git commit -m "feat(design-docs): add fumadocs-mdx source config"
```

---

### Task 4: Next.js config with transpilePackages

**Files:**
- Create: `apps/design-docs/next.config.ts`

`transpilePackages` is required so Next.js compiles `@nebutra/ui` source directly, avoiding stale `dist/` in dev.

**Step 1: Write next.config.ts**

```ts
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMDX = createMDX();

const nextConfig: NextConfig = {
  transpilePackages: ["@nebutra/ui"],
  reactStrictMode: true,
};

export default withMDX(nextConfig);
```

**Step 2: Commit**

```bash
git add apps/design-docs/next.config.ts
git commit -m "feat(design-docs): add Next.js config with fumadocs-mdx + transpilePackages"
```

---

### Task 5: Tailwind CSS v4 setup

**Files:**
- Create: `apps/design-docs/src/app/globals.css`

The project uses Tailwind v4 which is CSS-first (no `tailwind.config.ts` needed). Import the ui CSS variables as well.

**Step 1: Write globals.css**

```css
@import "tailwindcss";
@import "@nebutra/ui/styles/globals.css";
@import "fumadocs-ui/style.css";
```

Note: Tailwind v4 uses `@import "tailwindcss"` — not `@tailwind base/components/utilities`.

**Step 2: Verify the import path exists**

```bash
ls node_modules/@nebutra/ui/src/styles/globals.css
```

If using the built dist, the path is `@nebutra/ui/styles/globals.css` (as exported in package.json). With `transpilePackages`, Next.js will resolve to source.

**Step 3: Commit**

```bash
git add apps/design-docs/src/app/globals.css
git commit -m "feat(design-docs): add Tailwind v4 + ui globals.css"
```

---

## Phase 2 — Core Layout and Navigation

### Task 6: Source tree adapter (lib/source.ts)

**Files:**
- Create: `apps/design-docs/src/lib/source.ts`

Fumadocs requires a "source" adapter to load the MDX content tree at runtime.

**Step 1: Write lib/source.ts**

```ts
import { docs } from "@/.source";
import { loader } from "fumadocs-core/source";
import { createMDXSource } from "fumadocs-mdx";

export const source = loader({
  baseUrl: "/docs",
  source: createMDXSource(docs),
});
```

Note: `@/.source` is generated by fumadocs-mdx at build time into `.source/`.

**Step 2: Commit**

```bash
git add apps/design-docs/src/lib/source.ts
git commit -m "feat(design-docs): add fumadocs source adapter"
```

---

### Task 7: Root layout

**Files:**
- Create: `apps/design-docs/src/app/layout.tsx`

**Step 1: Write layout.tsx**

```tsx
import { RootProvider } from "fumadocs-ui/provider";
import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
```

**Step 2: Commit**

```bash
git add apps/design-docs/src/app/layout.tsx
git commit -m "feat(design-docs): add root layout with RootProvider"
```

---

### Task 8: Docs layout with sidebar

**Files:**
- Create: `apps/design-docs/src/app/docs/layout.tsx`

**Step 1: Write docs/layout.tsx**

```tsx
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: "Nebutra Design System",
        url: "/docs",
      }}
    >
      {children}
    </DocsLayout>
  );
}
```

**Step 2: Commit**

```bash
git add apps/design-docs/src/app/docs/layout.tsx
git commit -m "feat(design-docs): add DocsLayout with sidebar"
```

---

### Task 9: Dynamic MDX page renderer

**Files:**
- Create: `apps/design-docs/src/app/docs/[[...slug]]/page.tsx`

**Step 1: Write page.tsx**

```tsx
import { source } from "@/lib/source";
import {
  DocsPage,
  DocsBody,
  DocsDescription,
  DocsTitle,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug?: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();
  return {
    title: page.data.title,
    description: page.data.description,
  };
}
```

**Step 2: Commit**

```bash
git add apps/design-docs/src/app/docs/
git commit -m "feat(design-docs): add dynamic MDX page renderer"
```

---

### Task 10: Root redirect and placeholder content

**Files:**
- Create: `apps/design-docs/src/app/page.tsx`
- Create: `apps/design-docs/content/docs/index.mdx`

**Step 1: Write root page.tsx (redirect)**

```tsx
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/docs");
}
```

**Step 2: Write content/docs/index.mdx**

```mdx
---
title: Nebutra Design System
description: Component library documentation with live previews.
---

Welcome to the Nebutra Design System documentation.
```

**Step 3: Start dev server and verify it renders**

```bash
pnpm --filter @nebutra/design-docs dev
```

Open `http://localhost:3003/docs` — should show the index page with sidebar.

**Step 4: Commit**

```bash
git add apps/design-docs/src/app/page.tsx apps/design-docs/content/
git commit -m "feat(design-docs): add root redirect and placeholder index page"
```

---

## Phase 3 — ComponentPreview Infrastructure

### Task 11: ComponentPreview wrapper component

This is the core piece. `ComponentPreview` renders a live component in a "Preview" tab and its source code in a "Code" tab — mirroring the shadcn/ui pattern.

**Files:**
- Create: `apps/design-docs/src/components/component-preview.tsx`

**Step 1: Write component-preview.tsx**

```tsx
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "fumadocs-ui/components/tabs";
import type { ReactNode } from "react";

interface ComponentPreviewProps {
  /** The live-rendered component demo */
  children: ReactNode;
  /** Raw source code string for the Code tab */
  code?: string;
  /** Optional className for the preview container */
  className?: string;
}

export function ComponentPreview({
  children,
  code,
  className,
}: ComponentPreviewProps) {
  return (
    <Tabs defaultValue="preview" className="my-6">
      <TabsList>
        <TabsTrigger value="preview">Preview</TabsTrigger>
        {code && <TabsTrigger value="code">Code</TabsTrigger>}
      </TabsList>
      <TabsContent
        value="preview"
        className={`rounded-lg border bg-background p-6 ${className ?? ""}`}
      >
        {children}
      </TabsContent>
      {code && (
        <TabsContent value="code">
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
            <code>{code}</code>
          </pre>
        </TabsContent>
      )}
    </Tabs>
  );
}
```

**Step 2: Commit**

```bash
git add apps/design-docs/src/components/component-preview.tsx
git commit -m "feat(design-docs): add ComponentPreview wrapper with Preview/Code tabs"
```

---

### Task 12: MDX components registry

To use `ComponentPreview` and custom components inside MDX files without importing on every page, register them globally via `mdx-components.tsx`.

**Files:**
- Create: `apps/design-docs/mdx-components.tsx`

**Step 1: Write mdx-components.tsx**

```tsx
import defaultComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { ComponentPreview } from "@/components/component-preview";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    ComponentPreview,
    ...components,
  };
}
```

**Step 2: Commit**

```bash
git add apps/design-docs/mdx-components.tsx
git commit -m "feat(design-docs): register ComponentPreview in MDX components"
```

---

## Phase 4 — Pilot Component Pages

Goal: validate the full chain with 3 representative components before mass migration.

### Task 13: Button pilot page

**Files:**
- Create: `apps/design-docs/content/docs/components/button.mdx`
- Create: `apps/design-docs/src/components/previews/button-demo.tsx`

**Step 1: Write button-demo.tsx**

```tsx
"use client";

import { Button } from "@nebutra/ui/primitives";
import { Mail, ArrowRight } from "lucide-react";

export function ButtonDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="default">Default</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="destructive">Destructive</Button>
      <Button prefix={<Mail />}>With Icon</Button>
      <Button suffix={<ArrowRight />}>Continue</Button>
      <Button loading>Loading</Button>
    </div>
  );
}
```

**Step 2: Write button.mdx**

```mdx
---
title: Button
description: Interactive click target with eight visual variants, five size options, and icon slots.
---

import { ButtonDemo } from "@/components/previews/button-demo";
import { ComponentPreview } from "@/components/component-preview";

<ComponentPreview>
  <ButtonDemo />
</ComponentPreview>

## Installation

```tsx
import { Button, ButtonLink } from "@nebutra/ui/primitives"
\```

## Variants

```tsx
<Button variant="default">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button variant="warning">Warning</Button>
<Button variant="link">Learn more</Button>
\```

## Props

<TypeTable
  type={{
    variant: {
      description: "Visual style variant",
      type: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "tertiary" | "warning"',
      default: '"default"',
    },
    size: {
      description: "Size preset",
      type: '"tiny" | "sm" | "default" | "lg" | "icon"',
      default: '"default"',
    },
    loading: {
      description: "Show spinner and disable interaction",
      type: "boolean",
      default: "false",
    },
    asChild: {
      description: "Merge props onto the immediate child via Radix Slot",
      type: "boolean",
      default: "false",
    },
  }}
/>
```

Note: `TypeTable` is a fumadocs-ui built-in component — no import needed, it's in `defaultComponents`.

**Step 3: Start dev server and verify live preview renders**

```bash
pnpm --filter @nebutra/design-docs dev
```

Open `http://localhost:3003/docs/components/button` — should show live Button components in the Preview tab.

**Step 4: Commit**

```bash
git add apps/design-docs/content/docs/components/button.mdx \
        apps/design-docs/src/components/previews/button-demo.tsx
git commit -m "feat(design-docs): add Button pilot page with live preview"
```

---

### Task 14: Accordion pilot page

**Files:**
- Create: `apps/design-docs/content/docs/components/accordion.mdx`
- Create: `apps/design-docs/src/components/previews/accordion-demo.tsx`

**Step 1: Write accordion-demo.tsx**

```tsx
"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@nebutra/ui/primitives";

export function AccordionDemo() {
  return (
    <Accordion type="single" collapsible className="w-full max-w-md">
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>
          Yes. It adheres to the WAI-ARIA design pattern.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>
          Yes. It comes with default styles matching the design system.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-3">
        <AccordionTrigger>Is it animated?</AccordionTrigger>
        <AccordionContent>
          Yes. Animated by default, but can be disabled with CSS.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
```

**Step 2: Write accordion.mdx** (same pattern as button.mdx — import demo, ComponentPreview, then API docs)

Copy the existing content from `apps/docs-hub/design-system/atom-components/accordion.mdx`, replacing the static code block demo with:

```mdx
import { AccordionDemo } from "@/components/previews/accordion-demo";
import { ComponentPreview } from "@/components/component-preview";

<ComponentPreview>
  <AccordionDemo />
</ComponentPreview>
```

**Step 3: Commit**

```bash
git add apps/design-docs/content/docs/components/accordion.mdx \
        apps/design-docs/src/components/previews/accordion-demo.tsx
git commit -m "feat(design-docs): add Accordion pilot page with live preview"
```

---

### Task 15: Combobox pilot page (complex / stateful)

**Files:**
- Create: `apps/design-docs/content/docs/components/combobox.mdx`
- Create: `apps/design-docs/src/components/previews/combobox-demo.tsx`

**Step 1: Write combobox-demo.tsx**

```tsx
"use client";

import { useState } from "react";
import { Combobox } from "@nebutra/ui/primitives";

const frameworks = [
  { value: "next", label: "Next.js" },
  { value: "remix", label: "Remix" },
  { value: "astro", label: "Astro" },
  { value: "nuxt", label: "Nuxt" },
];

export function ComboboxDemo() {
  const [value, setValue] = useState("");

  return (
    <Combobox
      options={frameworks}
      value={value}
      onChange={setValue}
      placeholder="Select framework..."
    />
  );
}
```

**Step 2: Write combobox.mdx** — same pattern. Use existing API docs from `apps/docs-hub/design-system/atom-components/combobox.mdx`.

**Step 3: Verify — open `http://localhost:3003/docs/components/combobox`**

Click the combobox — dropdown should open, search should filter, selection should work.

**Step 4: Commit**

```bash
git add apps/design-docs/content/docs/components/combobox.mdx \
        apps/design-docs/src/components/previews/combobox-demo.tsx
git commit -m "feat(design-docs): add Combobox pilot page with live preview"
```

---

## Phase 5 — Navigation Structure

### Task 16: Set up content navigation (meta.json files)

Fumadocs uses `meta.json` files in each content directory to define sidebar order and labels.

**Files:**
- Create: `apps/design-docs/content/docs/meta.json`
- Create: `apps/design-docs/content/docs/components/meta.json`
- Create: `apps/design-docs/content/docs/foundations/meta.json`
- Create: `apps/design-docs/content/docs/patterns/meta.json`

**Step 1: Write content/docs/meta.json**

```json
{
  "title": "Design System",
  "pages": [
    "index",
    "...components",
    "...foundations",
    "...patterns"
  ]
}
```

**Step 2: Write content/docs/components/meta.json**

```json
{
  "title": "Atom Components",
  "pages": [
    "introduction",
    "accordion",
    "alert",
    "alert-dialog",
    "aspect-ratio",
    "avatar",
    "badge",
    "breadcrumb",
    "button",
    "calendar",
    "card",
    "carousel",
    "checkbox",
    "collapsible",
    "combobox",
    "command",
    "command-menu",
    "context-menu"
  ]
}
```

Note: This is abbreviated — the full list mirrors `mint.json`'s "Atom Components" section (all 115+ entries). Paste the full list from `apps/docs-hub/mint.json` lines 92–234.

**Step 3: Commit**

```bash
git add apps/design-docs/content/docs/
git commit -m "feat(design-docs): add navigation meta.json files"
```

---

## Phase 6 — Mass MDX Content Migration

The 145 MDX files from `apps/docs-hub/design-system/` need to be copied and lightly adapted. Fumadocs MDX is mostly compatible with Mintlify MDX — the main differences are:

| Mintlify | Fumadocs |
|---------|---------|
| `<Note>` | `<Callout>` (from fumadocs-ui) |
| `<Frame>` | Plain `<div>` or `<figure>` |
| No live preview | `<ComponentPreview>` wrapper |
| Navigation in `mint.json` | Navigation in `meta.json` |

### Task 17: Migrate foundations pages

**Files:**
- Copy `apps/docs-hub/design-system/foundations/*.mdx` → `apps/design-docs/content/docs/foundations/*.mdx`
- Replace `<Note>` with `<Callout>`
- Replace `<Frame>` with plain `<div>`

Foundations pages have no live component demos (they're color/typography/token docs), so no `ComponentPreview` needed.

**Step 1: Run migration script**

```bash
# From repo root
cp apps/docs-hub/design-system/foundations/*.mdx \
   apps/design-docs/content/docs/foundations/

# Replace <Note> with <Callout> across all copied files
# Use find+sed or your editor's find-replace:
find apps/design-docs/content/docs/foundations -name "*.mdx" \
  -exec sed -i '' 's/<Note>/<Callout>/g; s/<\/Note>/<\/Callout>/g' {} +
```

**Step 2: Add Callout import to affected files**

Fumadocs `<Callout>` is part of `defaultComponents` — it's auto-available in MDX, no import needed.

**Step 3: Commit**

```bash
git add apps/design-docs/content/docs/foundations/
git commit -m "feat(design-docs): migrate foundations pages from Mintlify"
```

---

### Task 18: Migrate atom-components pages (content only, no live demos yet)

**Files:**
- Copy `apps/docs-hub/design-system/atom-components/*.mdx` → `apps/design-docs/content/docs/components/*.mdx`
- Same `<Note>` → `<Callout>` replacement
- Remove the `<Note>` pointing to Storybook (it's redundant now that we have live previews)

**Step 1: Copy and adapt**

```bash
cp apps/docs-hub/design-system/atom-components/*.mdx \
   apps/design-docs/content/docs/components/

find apps/design-docs/content/docs/components -name "*.mdx" \
  -exec sed -i '' 's/<Note>/<Callout>/g; s/<\/Note>/<\/Callout>/g' {} +
```

**Step 2: Verify a few pages render correctly at `http://localhost:3003/docs/components/badge`**

**Step 3: Commit**

```bash
git add apps/design-docs/content/docs/components/
git commit -m "feat(design-docs): migrate atom-components pages (static content)"
```

---

### Task 19: Add live previews to high-priority components

After the bulk migration, add `ComponentPreview` + demo files for the most-used components. Priority order (add demo files to `src/components/previews/`):

1. `badge-demo.tsx`
2. `avatar-demo.tsx`
3. `tabs-demo.tsx`
4. `dialog-demo.tsx`
5. `dropdown-menu-demo.tsx`
6. `select-demo.tsx`
7. `input-demo.tsx`
8. `checkbox-demo.tsx`
9. `switch-demo.tsx`
10. `tooltip-demo.tsx`

For each: create `<ComponentName>Demo` in `src/components/previews/`, add `<ComponentPreview>` at the top of the corresponding MDX page.

Components with complex animations (AnimatedBeam, WarpBackground, etc.) or browser-only APIs (Stars Canvas, Globe) need `"use client"` + may need `dynamic(() => import(...), { ssr: false })` in their demo wrappers.

**Step 1: Implement each demo in a separate commit**

Example for Badge:

```tsx
// src/components/previews/badge-demo.tsx
"use client";
import { Badge } from "@nebutra/ui/primitives";
export function BadgeDemo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
    </div>
  );
}
```

**Step 2: Per-component commit**

```bash
git commit -m "feat(design-docs): add live preview for Badge"
```

---

### Task 20: Migrate fragment-components and ui-patterns pages

Same process as Task 18 — copy, adapt `<Note>` → `<Callout>`, verify.

Fragment components are complex multi-part components — live demos can be added incrementally as a follow-up task.

```bash
cp apps/docs-hub/design-system/fragment-components/*.mdx \
   apps/design-docs/content/docs/fragment-components/

cp apps/docs-hub/design-system/ui-patterns/*.mdx \
   apps/design-docs/content/docs/patterns/
```

**Commit:**

```bash
git commit -m "feat(design-docs): migrate fragment-components and ui-patterns pages"
```

---

## Phase 7 — Mintlify Cleanup

### Task 21: Strip design-system pages from mint.json

**Files:**
- Modify: `apps/docs-hub/mint.json`

Remove the following navigation groups entirely:
- "Atom Components" (lines 91–235)
- "Fragment Components" (lines 67–89)
- Remove the `design-system/` prefix from Foundations and UI Patterns groups

Keep: Getting Started group if it has product-level intro pages. Repurpose `apps/docs-hub` for product-facing docs (user manuals, API reference, Changelog).

**Step 1: Edit mint.json** — remove the three component navigation groups. Leave the structure ready for product docs to be added.

**Step 2: Optionally archive the MDX files** (do not delete — they are source of truth until fully migrated):

```bash
# The design-system/ folder in docs-hub can remain as a read reference
# but mint.json no longer links to it
```

**Step 3: Commit**

```bash
git add apps/docs-hub/mint.json
git commit -m "chore(docs-hub): remove design-system navigation groups (moved to design-docs)"
```

---

## Phase 8 — Turborepo + CI Integration

### Task 22: Add design-docs to Turborepo and root scripts

**Files:**
- Modify: `package.json` (root)
- Verify: `turbo.json` (no changes needed — tasks auto-discover from workspace)

**Step 1: Add dev script alias to root package.json**

```json
{
  "scripts": {
    "dev:design": "turbo run dev --filter=@nebutra/design-docs --filter=@nebutra/ui"
  }
}
```

`--filter=@nebutra/ui` ensures the tsup watch runs alongside Next.js dev.

**Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add dev:design script for design-docs + ui watch"
```

---

### Task 23: Vercel deployment config

**Files:**
- Create: `apps/design-docs/vercel.json` (if needed for custom build settings)

Fumadocs with Next.js deploys to Vercel as a standard Next.js app. No special config required beyond the Vercel project creation.

**Step 1: Create Vercel project**

In Vercel dashboard:
- Root directory: `apps/design-docs`
- Framework preset: Next.js
- Build command: `cd ../.. && pnpm turbo run build --filter=@nebutra/design-docs`
- Install command: `pnpm install --frozen-lockfile`

**Step 2: Set environment variables** (none required for the base setup)

**Step 3: Commit vercel.json if generated**

---

## Validation Checklist

Before marking migration complete:

- [ ] `http://localhost:3003/docs` renders with sidebar navigation
- [ ] Button page: live component renders in Preview tab
- [ ] Accordion: click triggers animation
- [ ] Combobox: dropdown opens, search filters, selection works
- [ ] Dark mode toggle in Fumadocs works (components respect CSS variables)
- [ ] TypeTable renders props tables correctly
- [ ] All 145+ MDX pages are accessible (no 404s)
- [ ] Mintlify `apps/docs-hub` still builds after removing design-system nav
- [ ] `pnpm typecheck --filter=@nebutra/design-docs` passes
- [ ] `pnpm build --filter=@nebutra/design-docs` succeeds

---

## Risk Register

| Risk | Mitigation |
|------|-----------|
| `@nebutra/ui` CSS variables don't apply in Fumadocs | Verify `@import "@nebutra/ui/styles/globals.css"` is before `fumadocs-ui/style.css` in globals.css |
| Some components use `window`/`document` — SSR errors | Wrap with `dynamic(() => import(...), { ssr: false })` in demo files |
| Three.js / WebGL components (Stars Canvas, Globe) are heavy | Use `dynamic` + `ssr: false` in demo, show static screenshot as fallback |
| Fumadocs `@/.source` type doesn't resolve | Run `next dev` once to let fumadocs-mdx generate `.source/` |
| `transpilePackages` causes Tailwind v4 to double-process | Use `@source` directive or limit scanning scope in globals.css |

---

## Estimated Scope

| Phase | Tasks | Complexity |
|-------|-------|-----------|
| 1 — Bootstrap | 5 tasks | Low |
| 2 — Core Layout | 4 tasks | Low |
| 3 — ComponentPreview | 2 tasks | Medium |
| 4 — Pilot Pages | 3 tasks | Medium |
| 5 — Navigation | 1 task | Low |
| 6 — Mass Migration | 4 tasks | Medium (bulk copy) |
| 7 — Mintlify Cleanup | 1 task | Low |
| 8 — CI/Deployment | 2 tasks | Low |
| **Total** | **22 tasks** | |
