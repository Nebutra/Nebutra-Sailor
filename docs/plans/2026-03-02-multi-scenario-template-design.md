# Multi-Scenario Template Architecture — Full Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plans from this design.

**Goal:** Transform Nebutra-Sailor from a single-scenario SaaS monorepo into a low-switching-cost multi-scenario development template supporting 9 use cases.

**Architecture:** Hybrid approach — build-time app selection via `nebutra.config.ts` + runtime feature flags within each app. Turbo's `--filter` builds only selected apps; `@nebutra/feature-flags` toggles functionality within apps.

**Tech Stack:** Next.js 16, React 19, Hono, Prisma 7, Tailwind CSS v4, Meilisearch, Discourse, Stripe + native Alipay/WeChat, Pusher, next-intl v4

**Decisions Made:**

- Scenario switching: **Hybrid** (build-time + runtime)
- Blog: **Independent `apps/blog`**
- Admin: **Independent `apps/admin`**
- Community: **Full-featured** (real-time chat, badges, recommendations, search)
- Forum: **Discourse** (external service, core NOT vendored — plugins/themes/config in repo)
- Discourse deployment: **Dual** (Docker Compose dev + K8s Helm prod)
- Discourse SSO: **OIDC via Clerk**
- Search engine: **Meilisearch**
- China payments: **Dual** (Stripe overseas + native SDK domestic)

---

## Target Scenarios

| ID  | Scenario                  | Key Apps                       | Key Packages                       |
| --- | ------------------------- | ------------------------------ | ---------------------------------- |
| S1  | AI SaaS                   | web, landing, api-gateway | ai-providers, billing, identity    |
| S2  | Enterprise Marketing      | landing, blog, studio     | sanity, marketing, analytics       |
| S3  | B2B DevOps Dashboard      | web, admin, api-gateway        | billing, audit, health             |
| S4  | Chinese AI Going Overseas | web, landing, api-gateway | billing (dual), ai-providers, i18n |
| S5  | Product Hunt Growth       | landing, blog, web        | growth, marketing, analytics       |
| S6  | Creative UIUX Showcase    | landing, storybook, blog  | theme, icons, brand                |
| S7  | Personal Blog/Portfolio   | blog, landing             | sanity, theme, community           |
| S8  | Vertical Domain Community | web, blog, api-gateway         | community, search, growth          |
| S9  | One-Person Company        | web, landing, admin, blog | preset, billing, analytics         |

---

## Layer 1: Scenario Preset System

### Problem

No mechanism to activate/deactivate features per scenario. Switching = manual code surgery.

### Architecture

```
nebutra.config.ts (root)
       │
       ▼
packages/ops/preset/
  ├── src/config.ts         — defineConfig() + resolveConfig()
  ├── src/presets/*.ts      — 9 preset definitions
  ├── src/turbo-filter.ts   — generates turbo --filter args
  └── src/feature-map.ts    — maps features → packages → env vars
       │
       ▼
turbo.json reads config → builds only selected apps
       │
       ▼
@nebutra/feature-flags reads config → enables runtime toggles
```

### Package: `packages/preset`

```
packages/ops/preset/
  src/
    index.ts                 # Public API: defineConfig, resolveConfig, getPreset
    config.ts                # Config schema (Zod), merging logic
    presets/
      index.ts               # Re-exports all presets
      ai-saas.ts
      marketing.ts
      dashboard.ts
      overseas.ts
      growth.ts
      creative.ts
      blog-portfolio.ts
      community.ts
      one-person.ts
      full.ts                # Everything enabled (development default)
    turbo-filter.ts          # resolveConfig → turbo --filter args
    feature-map.ts           # Feature keys → package names → env vars
    cli.ts                   # Optional: init command for scaffolding
  package.json
  tsconfig.json
```

### Core API

```typescript
// packages/ops/preset/src/config.ts
import { z } from "zod";

export const PresetId = z.enum([
  "ai-saas",
  "marketing",
  "dashboard",
  "overseas",
  "growth",
  "creative",
  "blog-portfolio",
  "community",
  "one-person",
  "full",
]);

export const AppId = z.enum([
  "web",
  "landing",
  "blog",
  "admin",
  "api-gateway",
  "studio",
  "storybook",
  "docs-hub",
]);

export const FeatureId = z.enum([
  "billing",
  "ai",
  "ecommerce",
  "web3",
  "community",
  "blog",
  "growth",
  "search",
  "sso",
  "admin",
  "analytics",
  "newsletter",
  "realtime",
  "upload",
]);

export const ThemeId = z.enum([
  "neon",
  "gradient",
  "dark-dense",
  "minimal",
  "vibrant",
  "ocean",
  "custom",
]);

export const NebutraConfigSchema = z.object({
  preset: PresetId.default("full"),
  apps: z.record(AppId, z.boolean()).optional(), // Override preset's app selection
  features: z.record(FeatureId, z.boolean()).optional(), // Override preset's features
  theme: ThemeId.default("neon"),
  locales: z.array(z.string()).default(["en"]),
  defaultLocale: z.string().default("en"),
});

export type NebutraConfig = z.infer<typeof NebutraConfigSchema>;

export function defineConfig(config: Partial<NebutraConfig>): NebutraConfig {
  return NebutraConfigSchema.parse(config);
}

export function resolveConfig(config: NebutraConfig): ResolvedConfig {
  const preset = getPreset(config.preset);
  return {
    apps: { ...preset.apps, ...config.apps },
    features: { ...preset.features, ...config.features },
    theme: config.theme,
    locales: config.locales,
    defaultLocale: config.defaultLocale,
  };
}
```

### Preset Definitions

```typescript
// packages/ops/preset/src/presets/ai-saas.ts
import type { PresetDefinition } from "../config";

export const aiSaas: PresetDefinition = {
  id: "ai-saas",
  name: "AI SaaS",
  description:
    "AI-powered SaaS with billing, multi-tenancy, and provider abstraction",
  apps: {
    web: true,
    "landing": true,
    "api-gateway": true,
    studio: true,
    blog: false,
    admin: true,
    storybook: false,
    "docs-hub": true,
  },
  features: {
    billing: true,
    ai: true,
    analytics: true,
    growth: true,
    realtime: true,
    upload: true,
    ecommerce: false,
    web3: false,
    community: false,
    blog: false,
    search: false,
    sso: false,
    admin: true,
    newsletter: false,
  },
  theme: "neon",
};
```

### Turbo Integration

```typescript
// packages/ops/preset/src/turbo-filter.ts
export function getTurboFilters(config: ResolvedConfig): string[] {
  const activeApps = Object.entries(config.apps)
    .filter(([, enabled]) => enabled)
    .map(([app]) => app);

  // Map app names to package names
  const packageMap: Record<string, string> = {
    web: "@nebutra/web",
    "landing": "@nebutra/landing",
    blog: "@nebutra/blog",
    admin: "@nebutra/admin",
    "api-gateway": "@nebutra/api-gateway",
    studio: "@nebutra/studio",
    storybook: "@nebutra/storybook",
    "docs-hub": "@nebutra/docs-hub",
  };

  return activeApps.map((app) => `--filter=${packageMap[app]}`);
}

// Usage in package.json scripts:
// "build:preset": "tsx packages/ops/preset/src/turbo-filter.ts | xargs turbo build"
```

### Root Config File

```typescript
// nebutra.config.ts (monorepo root)
import { defineConfig } from "@nebutra/preset";

export default defineConfig({
  preset: "ai-saas",
  theme: "neon",
  locales: ["en", "zh"],
  defaultLocale: "en",
  // Optional overrides:
  // apps: { blog: true },     // Enable blog on top of ai-saas preset
  // features: { web3: true }, // Enable web3 on top of ai-saas preset
});
```

### Integration with Feature Flags

```typescript
// packages/ops/preset/src/feature-map.ts
// Generates FEATURE_FLAG_* env vars from config
export function getFeatureEnvVars(
  config: ResolvedConfig,
): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [feature, enabled] of Object.entries(config.features)) {
    const envKey = `FEATURE_FLAG_${feature.toUpperCase().replace(/-/g, "_")}`;
    vars[envKey] = String(enabled);
  }
  return vars;
}
```

### Scenario Mapping Table

| Preset         | apps                                          | features ON                                             | theme      |
| -------------- | --------------------------------------------- | ------------------------------------------------------- | ---------- |
| ai-saas        | web, landing, api-gw, studio, admin, docs-hub | billing, ai, analytics, growth, realtime, upload, admin | neon       |
| marketing      | landing, blog, studio                         | analytics, blog, newsletter, growth, upload             | gradient   |
| dashboard      | web, admin, api-gw                            | billing, analytics, audit, realtime, upload, admin, sso | dark-dense |
| overseas       | web, landing, api-gw, blog                    | billing, ai, analytics, growth, search, newsletter      | neon       |
| growth         | landing, blog, web                            | growth, analytics, blog, newsletter, community          | gradient   |
| creative       | landing, storybook, blog                      | blog, upload, analytics                                 | vibrant    |
| blog-portfolio | blog, landing                                 | blog, newsletter, community, search                     | minimal    |
| community      | web, blog, api-gw                             | community, search, growth, realtime, newsletter, upload | ocean      |
| one-person     | web, landing, admin, blog                     | billing, ai, analytics, blog, admin, growth             | neon       |
| full           | ALL                                           | ALL                                                     | neon       |

---

## Layer 2: Theme Engine

### Problem

Design system has dark/light toggle only. Each scenario needs a distinct visual identity. No CSS variable layer.

### Architecture

```
packages/design/theme/
  ├── src/
  │   ├── index.ts              # Public API
  │   ├── tokens.ts             # Token interface + default values
  │   ├── presets/              # Theme preset definitions
  │   │   ├── neon.ts           # AI SaaS — dark, vibrant purple/blue accents
  │   │   ├── gradient.ts       # Marketing — light, blue gradient
  │   │   ├── dark-dense.ts     # DevOps — dark, green, sharp corners
  │   │   ├── minimal.ts        # Blog — light, serif headings
  │   │   ├── vibrant.ts        # Creative — bold, orange/amber
  │   │   └── ocean.ts          # Community — teal/cyan, friendly
  │   ├── provider.tsx          # ThemeProvider (client component)
  │   ├── use-theme.ts          # useTheme hook
  │   ├── tailwind-plugin.ts    # Tailwind CSS v4 plugin
  │   └── utils.ts              # Color manipulation, contrast checking
  ├── package.json
  └── tsconfig.json
```

### Token System

```typescript
// packages/design/theme/src/tokens.ts
export interface ThemeTokens {
  // Color primitives
  colors: {
    // Brand
    primary: string;
    "primary-foreground": string;
    secondary: string;
    "secondary-foreground": string;
    accent: string;
    "accent-foreground": string;

    // Semantic
    background: string;
    foreground: string;
    card: string;
    "card-foreground": string;
    popover: string;
    "popover-foreground": string;
    muted: string;
    "muted-foreground": string;
    border: string;
    input: string;
    ring: string;

    // Status
    destructive: string;
    "destructive-foreground": string;
    success: string;
    "success-foreground": string;
    warning: string;
    "warning-foreground": string;
    info: string;
    "info-foreground": string;
  };

  // Layout
  radius: {
    sm: string; // 0.25rem default
    md: string; // 0.375rem
    lg: string; // 0.5rem
    xl: string; // 0.75rem
    full: string; // 9999px
  };

  // Typography
  fonts: {
    sans: string;
    mono: string;
    heading: string; // Can differ from sans
  };

  // Spacing scale (Tailwind-compatible)
  spacing: Record<string, string>;

  // Shadows
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };

  // Transitions
  transitions: {
    fast: string; // 150ms
    normal: string; // 250ms
    slow: string; // 400ms
  };
}
```

### Theme Presets

```typescript
// packages/design/theme/src/presets/neon.ts
import type { ThemeTokens } from "../tokens";

export const neon: ThemeTokens = {
  colors: {
    primary: "#7c3aed", // Violet-600
    "primary-foreground": "#ffffff",
    secondary: "#06b6d4", // Cyan-500
    "secondary-foreground": "#ffffff",
    accent: "#a78bfa", // Violet-400
    "accent-foreground": "#09090b",
    background: "#09090b", // Zinc-950
    foreground: "#fafafa", // Zinc-50
    card: "#18181b", // Zinc-900
    "card-foreground": "#fafafa",
    popover: "#18181b",
    "popover-foreground": "#fafafa",
    muted: "#27272a", // Zinc-800
    "muted-foreground": "#a1a1aa", // Zinc-400
    border: "#27272a",
    input: "#27272a",
    ring: "#7c3aed",
    destructive: "#ef4444",
    "destructive-foreground": "#ffffff",
    success: "#22c55e",
    "success-foreground": "#ffffff",
    warning: "#f59e0b",
    "warning-foreground": "#000000",
    info: "#3b82f6",
    "info-foreground": "#ffffff",
  },
  radius: {
    sm: "0.25rem",
    md: "0.375rem",
    lg: "0.5rem",
    xl: "0.75rem",
    full: "9999px",
  },
  fonts: {
    sans: "Inter, system-ui, sans-serif",
    mono: "JetBrains Mono, Fira Code, monospace",
    heading: "Inter, system-ui, sans-serif",
  },
  spacing: {}, // Use Tailwind defaults
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.5)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.5)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.5)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.5)",
  },
  transitions: {
    fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
    normal: "250ms cubic-bezier(0.4, 0, 0.2, 1)",
    slow: "400ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
};
```

### ThemeProvider

```typescript
// packages/design/theme/src/provider.tsx
'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ThemeTokens } from './tokens'
import { neon } from './presets/neon'

interface ThemeContextValue {
  theme: ThemeTokens
  themeId: string
  setTheme: (id: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function tokensToCSS(tokens: ThemeTokens): string {
  const vars: string[] = []
  for (const [key, value] of Object.entries(tokens.colors)) {
    vars.push(`--color-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(tokens.radius)) {
    vars.push(`--radius-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(tokens.fonts)) {
    vars.push(`--font-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(tokens.shadows)) {
    vars.push(`--shadow-${key}: ${value};`)
  }
  for (const [key, value] of Object.entries(tokens.transitions)) {
    vars.push(`--transition-${key}: ${value};`)
  }
  return vars.join('\n')
}

interface ThemeProviderProps {
  children: ReactNode
  defaultTheme?: string
  themes: Record<string, ThemeTokens>
}

export function ThemeProvider({ children, defaultTheme = 'neon', themes }: ThemeProviderProps) {
  const [themeId, setThemeId] = useState(defaultTheme)
  const theme = themes[themeId] ?? neon

  useEffect(() => {
    const root = document.documentElement
    const css = tokensToCSS(theme)
    root.style.cssText = css
  }, [theme])

  const value = useMemo(() => ({ theme, themeId, setTheme: setThemeId }), [theme, themeId])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
```

### Tailwind CSS v4 Integration

```typescript
// packages/design/theme/src/tailwind-plugin.ts
// Generates @theme block for Tailwind CSS v4

import type { ThemeTokens } from "./tokens";

export function generateTailwindTheme(tokens: ThemeTokens): string {
  return `
@theme {
  /* Colors */
  --color-primary: ${tokens.colors.primary};
  --color-primary-foreground: ${tokens.colors["primary-foreground"]};
  --color-secondary: ${tokens.colors.secondary};
  --color-secondary-foreground: ${tokens.colors["secondary-foreground"]};
  --color-accent: ${tokens.colors.accent};
  --color-accent-foreground: ${tokens.colors["accent-foreground"]};
  --color-background: ${tokens.colors.background};
  --color-foreground: ${tokens.colors.foreground};
  --color-card: ${tokens.colors.card};
  --color-card-foreground: ${tokens.colors["card-foreground"]};
  --color-muted: ${tokens.colors.muted};
  --color-muted-foreground: ${tokens.colors["muted-foreground"]};
  --color-border: ${tokens.colors.border};
  --color-ring: ${tokens.colors.ring};
  --color-destructive: ${tokens.colors.destructive};
  --color-success: ${tokens.colors.success};
  --color-warning: ${tokens.colors.warning};
  --color-info: ${tokens.colors.info};

  /* Radius */
  --radius-sm: ${tokens.radius.sm};
  --radius-md: ${tokens.radius.md};
  --radius-lg: ${tokens.radius.lg};
  --radius-xl: ${tokens.radius.xl};
  --radius-full: ${tokens.radius.full};

  /* Fonts */
  --font-sans: ${tokens.fonts.sans};
  --font-mono: ${tokens.fonts.mono};
  --font-heading: ${tokens.fonts.heading};
}
`;
}
```

### Theme-Scenario Mapping

| Theme      | Primary            | Background         | Font Heading     | Radius  | Target Scenario               |
| ---------- | ------------------ | ------------------ | ---------------- | ------- | ----------------------------- |
| neon       | #7c3aed (violet)   | #09090b (zinc-950) | Inter            | default | AI SaaS, Overseas, One-Person |
| gradient   | #2563eb (blue-600) | #ffffff            | Inter            | rounded | Marketing, Growth             |
| dark-dense | #10b981 (emerald)  | #0a0a0a            | JetBrains Mono   | sharp   | DevOps Dashboard              |
| minimal    | #18181b (zinc-900) | #fafafa            | Playfair Display | default | Blog/Portfolio                |
| vibrant    | #f97316 (orange)   | #fffbeb            | Space Grotesk    | pill    | Creative UIUX                 |
| ocean      | #0891b2 (cyan-600) | #f0fdfa            | Inter            | rounded | Community                     |

---

## Layer 3: Dashboard App Skeleton (`apps/web`)

### Problem

`apps/web` is an auth shell. All data-intensive scenarios (AI SaaS, DevOps, Admin) need common dashboard patterns.

### Architecture

Extend existing `apps/web` with a composable layout system and reusable dashboard components in `packages/ui`.

```
apps/web/src/
  app/
    [lang]/
      (dashboard)/              # Authenticated dashboard routes
        layout.tsx              # DashboardShell (sidebar + topbar + command palette)
        page.tsx                # Dashboard home (overview widgets)
        settings/
          page.tsx              # User/org settings
          profile/page.tsx
          billing/page.tsx
          team/page.tsx
          security/page.tsx
        notifications/page.tsx  # Notification center
      (auth)/                   # Existing auth routes
        sign-in/
        sign-up/
  components/
    dashboard/
      DashboardShell.tsx        # Main layout: sidebar + topbar
      Sidebar.tsx               # Collapsible sidebar with nav groups
      TopBar.tsx                # Breadcrumbs + search + user menu
      CommandPalette.tsx        # Cmd+K palette (cmdk)
      NotificationCenter.tsx    # Bell icon + dropdown
      WidgetGrid.tsx            # Responsive grid for dashboard widgets
      Widget.tsx                # Card wrapper with title, actions, loading
    data/
      DataTable.tsx             # Sortable, filterable, paginated table
      DataTableToolbar.tsx      # Filters, search, bulk actions
      DataTablePagination.tsx   # Page size selector + navigation
      ColumnDef.ts              # Column definition helpers
    charts/
      AreaChart.tsx             # Recharts area wrapper
      BarChart.tsx              # Recharts bar wrapper
      LineChart.tsx             # Recharts line wrapper
      PieChart.tsx              # Recharts pie wrapper
      SparkLine.tsx             # Inline sparkline for tables
      ChartContainer.tsx        # Responsive container with loading
    feedback/
      EmptyState.tsx            # Illustration + text + action
      Skeleton.tsx              # Content skeleton loader
      ErrorFallback.tsx         # Error state with retry
```

### DashboardShell Layout

```typescript
// apps/web/src/components/dashboard/DashboardShell.tsx
'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { CommandPalette } from './CommandPalette'

interface DashboardShellProps {
  children: ReactNode
  nav: NavGroup[]          // Injected per-scenario
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number  // Notification count
  active?: boolean
}

export function DashboardShell({ children, nav }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [commandOpen, setCommandOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar nav={nav} open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} onCommandOpen={() => setCommandOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
```

### DataTable Component

```typescript
// apps/web/src/components/data/DataTable.tsx
"use client";

import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { useState } from "react";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchKey?: string; // Column key for global search
  pageSize?: number; // Default: 20
  onRowClick?: (row: TData) => void;
  toolbar?: React.ReactNode; // Custom toolbar above table
  emptyState?: React.ReactNode; // Custom empty state
}

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  pageSize = 20,
  onRowClick,
  toolbar,
  emptyState,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: { sorting, columnFilters, globalFilter },
    initialState: { pagination: { pageSize } },
  });

  // ... render table with sorting indicators, pagination, etc.
}
```

### New Dependencies

```
@tanstack/react-table    # Headless table
cmdk                     # Command palette
recharts                 # Already in deps (via ui)
```

---

## Layer 4: Blog/Content App (`apps/blog`)

### Problem

Sanity CMS exists but no frontend rendering app. Blog/changelog/portfolio content has no home.

### Architecture

Dual content source: Sanity CMS for non-technical authors + MDX files for developer content.

```
apps/blog/
  src/
    app/
      [lang]/
        layout.tsx                # Blog layout (header, footer, sidebar)
        page.tsx                  # Blog index (paginated posts)
        [slug]/page.tsx           # Post detail (MDX or Sanity)
        category/[cat]/page.tsx   # Category listing
        tag/[tag]/page.tsx        # Tag listing
        changelog/page.tsx        # Product changelog (for Growth scenario)
        rss.xml/route.ts          # RSS feed generation
    components/
      PostCard.tsx                # Post preview card
      PostContent.tsx             # MDX renderer + Sanity portable text
      TableOfContents.tsx         # Auto-generated TOC from headings
      AuthorCard.tsx              # Author bio + avatar
      NewsletterForm.tsx          # Email subscription (Resend)
      Comments.tsx                # Giscus integration
      RelatedPosts.tsx            # Recommendation-based related posts
      ShareButtons.tsx            # Social sharing (OG-aware)
    lib/
      mdx.ts                     # MDX compilation + frontmatter
      sanity-queries.ts           # GROQ queries for Sanity content
      rss.ts                      # RSS feed generation
      structured-data.ts          # JSON-LD for blog posts
    content/                      # MDX files (git-based content)
      posts/
        2026-03-02-hello-world.mdx
      authors/
        default.json
  i18n/                           # Reuse same next-intl pattern
    routing.ts
    request.ts
    navigation.ts
  messages/
    en.json
    zh.json
  next.config.ts
  package.json
```

### Content Model

**Sanity Schema** (add to `apps/studio`):

```typescript
// Blog post schema
{
  name: 'post',
  type: 'document',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'slug', type: 'slug', options: { source: 'title' } },
    { name: 'excerpt', type: 'text', rows: 3 },
    { name: 'body', type: 'portableText' },
    { name: 'coverImage', type: 'image' },
    { name: 'author', type: 'reference', to: [{ type: 'author' }] },
    { name: 'categories', type: 'array', of: [{ type: 'reference', to: [{ type: 'category' }] }] },
    { name: 'tags', type: 'array', of: [{ type: 'string' }] },
    { name: 'publishedAt', type: 'datetime' },
    { name: 'locale', type: 'string' },
    { name: 'seo', type: 'seo' },  // title, description, ogImage
  ]
}
```

### MDX Support

```typescript
// apps/blog/src/lib/mdx.ts
import { compileMDX } from "next-mdx-remote/rsc";
import { readFile, readdir } from "fs/promises";
import path from "path";

interface PostFrontmatter {
  title: string;
  date: string;
  excerpt: string;
  author: string;
  tags: string[];
  category: string;
  coverImage?: string;
  locale: string;
}

export async function getPostBySlug(slug: string) {
  const filePath = path.join(process.cwd(), "src/content/posts", `${slug}.mdx`);
  const source = await readFile(filePath, "utf-8");

  const { content, frontmatter } = await compileMDX<PostFrontmatter>({
    source,
    options: { parseFrontmatter: true },
    components: mdxComponents,
  });

  return { content, frontmatter, slug };
}
```

### RSS Feed

```typescript
// apps/blog/src/app/[lang]/rss.xml/route.ts
import { NextResponse } from "next/server";
import { generateRssFeed } from "@/lib/rss";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lang: string }> },
) {
  const { lang } = await params;
  const feed = await generateRssFeed(lang);

  return new NextResponse(feed, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
```

### JSON-LD Structured Data

```typescript
// apps/blog/src/lib/structured-data.ts
export function blogPostJsonLd(post: Post): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: {
      "@type": "Person",
      name: post.author.name,
    },
    image: post.coverImage,
    description: post.excerpt,
  });
}
```

### Newsletter Integration

```typescript
// API route in api-gateway
// POST /api/v1/newsletter/subscribe
// Uses @nebutra/legal for consent + Resend for double opt-in

import { Resend } from "resend";

export async function subscribeToNewsletter(email: string, locale: string) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.contacts.create({
    email,
    audienceId: process.env.RESEND_AUDIENCE_ID!,
    firstName: "",
    lastName: "",
    unsubscribed: false,
  });
}
```

---

## Layer 5: Growth / Viral Loop Tools

### Problem

Marketing package has Product Hunt + Dub but no core growth mechanics (referrals, waitlist, changelog, feedback).

### Package: `packages/growth`

```
packages/growth/
  src/
    index.ts
    referral/
      index.ts            # Referral system core
      schema.ts           # Zod schemas for referral codes
      generate-code.ts    # Unique referral code generation
    waitlist/
      index.ts            # Waitlist management
      schema.ts           # Email + position tracking
    changelog/
      index.ts            # Changelog entry management
      schema.ts           # Changelog entry schema
    feedback/
      index.ts            # Feedback collection
      schema.ts           # Feedback submission schema
    ab-testing/
      index.ts            # Simple A/B test assignment
      schema.ts           # Experiment + variant schemas
    og-image/
      index.ts            # OG image generation (Satori)
  package.json
```

### New Database Models

```prisma
// Add to packages/platform/db/prisma/schema.prisma

// ============================================
// Growth & Viral Loop
// ============================================

model ReferralCode {
  id             String    @id @default(cuid())
  organizationId String?   @map("organization_id")
  userId         String    @map("user_id")
  code           String    @unique @db.VarChar(20)
  reward         Json      @default("{}")  // { type: "credits", amount: 100 }
  maxUses        Int?      @map("max_uses")
  usedCount      Int       @default(0) @map("used_count")
  expiresAt      DateTime? @map("expires_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  referrals Referral[]

  @@index([userId])
  @@index([code])
  @@map("referral_codes")
}

model Referral {
  id              String   @id @default(cuid())
  referralCodeId  String   @map("referral_code_id")
  referredUserId  String   @map("referred_user_id")
  referredEmail   String?  @map("referred_email")
  status          String   @default("pending") @db.VarChar(20)  // pending, completed, rewarded
  rewardedAt      DateTime? @map("rewarded_at")
  createdAt       DateTime @default(now()) @map("created_at")

  referralCode ReferralCode @relation(fields: [referralCodeId], references: [id])

  @@unique([referralCodeId, referredUserId])
  @@map("referrals")
}

model WaitlistEntry {
  id          String    @id @default(cuid())
  email       String    @unique
  name        String?
  position    Int       @default(autoincrement())
  referredBy  String?   @map("referred_by")  // referral code
  status      String    @default("waiting") @db.VarChar(20)  // waiting, invited, joined
  invitedAt   DateTime? @map("invited_at")
  joinedAt    DateTime? @map("joined_at")
  metadata    Json      @default("{}")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([status])
  @@index([position])
  @@map("waitlist_entries")
}

model ChangelogEntry {
  id          String   @id @default(cuid())
  title       String
  slug        String   @unique
  body        String   @db.Text  // Markdown
  type        String   @db.VarChar(20)  // feature, improvement, fix, breaking
  version     String?  @db.VarChar(20)
  publishedAt DateTime? @map("published_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([publishedAt])
  @@index([type])
  @@map("changelog_entries")
}

model FeedbackSubmission {
  id             String   @id @default(cuid())
  organizationId String?  @map("organization_id")
  userId         String?  @map("user_id")
  email          String?
  type           String   @db.VarChar(20)  // bug, feature, improvement, other
  title          String
  body           String   @db.Text
  status         String   @default("new") @db.VarChar(20)  // new, reviewing, planned, done, declined
  votes          Int      @default(0)
  metadata       Json     @default("{}")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([type])
  @@index([votes])
  @@map("feedback_submissions")
}

model Experiment {
  id          String   @id @default(cuid())
  key         String   @unique @db.VarChar(100)
  name        String
  description String?
  variants    Json     // [{ id: "a", weight: 50 }, { id: "b", weight: 50 }]
  isActive    Boolean  @default(true) @map("is_active")
  startedAt   DateTime? @map("started_at")
  endedAt     DateTime? @map("ended_at")
  createdAt   DateTime @default(now()) @map("created_at")

  assignments ExperimentAssignment[]

  @@map("experiments")
}

model ExperimentAssignment {
  id           String   @id @default(cuid())
  experimentId String   @map("experiment_id")
  userId       String?  @map("user_id")
  visitorId    String?  @map("visitor_id")
  variant      String   @db.VarChar(50)
  converted    Boolean  @default(false)
  createdAt    DateTime @default(now()) @map("created_at")

  experiment Experiment @relation(fields: [experimentId], references: [id])

  @@unique([experimentId, userId])
  @@unique([experimentId, visitorId])
  @@map("experiment_assignments")
}
```

### OG Image Generation

```typescript
// packages/growth/src/og-image/index.ts
// Uses Satori + @vercel/og for dynamic OG images

import { ImageResponse } from "next/og";

interface OGImageOptions {
  title: string;
  subtitle?: string;
  theme: "neon" | "gradient" | "minimal";
  logo?: string;
}

export function generateOGImage(options: OGImageOptions): ImageResponse {
  return new ImageResponse();
  // JSX template that renders the OG image
  // Different visual styles per theme
}

// Usage in Next.js:
// app/[lang]/og/[...slug]/route.tsx → exports GET handler
```

---

## Layer 6: China Overseas Payment

### Problem

Schema defines `ALIPAY`/`WECHAT_PAY` but no implementation. Chinese market needs native payment integration.

### Architecture

Extend `packages/billing` with a payment gateway abstraction layer.

```
packages/commerce/billing/src/
  gateways/
    index.ts                 # PaymentGateway interface + factory
    stripe.ts                # Stripe implementation (existing, refactored)
    alipay.ts                # Native Alipay SDK implementation
    wechat-pay.ts            # Native WeChat Pay SDK implementation
  utils/
    currency.ts              # Currency conversion + formatting
    region-detector.ts       # Detect user region → suggest payment method
```

### Payment Gateway Abstraction

```typescript
// packages/commerce/billing/src/gateways/index.ts
export interface PaymentGateway {
  readonly provider: "stripe" | "alipay" | "wechat-pay";

  createPaymentIntent(params: CreatePaymentParams): Promise<PaymentIntent>;
  confirmPayment(intentId: string): Promise<PaymentResult>;
  createRefund(paymentId: string, amount?: number): Promise<RefundResult>;
  handleWebhook(payload: string, signature: string): Promise<WebhookEvent>;
}

export interface CreatePaymentParams {
  amount: number; // In smallest currency unit (cents/fen)
  currency: string; // ISO 4217
  description: string;
  customerId: string; // Internal org ID
  metadata: Record<string, string>;
  returnUrl?: string; // For redirect-based flows (Alipay/WeChat)
}

export interface PaymentIntent {
  id: string;
  clientSecret?: string; // For Stripe Elements
  redirectUrl?: string; // For Alipay/WeChat redirect
  qrCodeUrl?: string; // For WeChat QR code payment
  status: "pending" | "processing" | "succeeded" | "failed";
}
```

### Stripe Gateway (existing, refactored)

```typescript
// packages/commerce/billing/src/gateways/stripe.ts
import Stripe from "stripe";

export class StripeGateway implements PaymentGateway {
  readonly provider = "stripe" as const;
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async createPaymentIntent(
    params: CreatePaymentParams,
  ): Promise<PaymentIntent> {
    const intent = await this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      metadata: params.metadata,
      // For Alipay/WeChat via Stripe:
      // payment_method_types: ['alipay'] or ['wechat_pay']
    });
    return {
      id: intent.id,
      clientSecret: intent.client_secret ?? undefined,
      status: "pending",
    };
  }

  // ... confirmPayment, createRefund, handleWebhook
}
```

### Native Alipay Gateway

```typescript
// packages/commerce/billing/src/gateways/alipay.ts
// Uses alipay-sdk (npm)

import AlipaySdk from "alipay-sdk";

export class AlipayGateway implements PaymentGateway {
  readonly provider = "alipay" as const;
  private sdk: AlipaySdk;

  constructor(config: AlipayConfig) {
    this.sdk = new AlipaySdk({
      appId: config.appId,
      privateKey: config.privateKey,
      alipayPublicKey: config.alipayPublicKey,
      gateway: config.sandbox
        ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
        : "https://openapi.alipay.com/gateway.do",
    });
  }

  async createPaymentIntent(
    params: CreatePaymentParams,
  ): Promise<PaymentIntent> {
    const result = await this.sdk.pageExec("alipay.trade.page.pay", {
      bizContent: {
        out_trade_no: `neb_${Date.now()}`,
        total_amount: (params.amount / 100).toFixed(2), // Alipay uses yuan, not fen
        subject: params.description,
        product_code: "FAST_INSTANT_TRADE_PAY",
      },
      returnUrl: params.returnUrl,
    });

    return {
      id: result.outTradeNo,
      redirectUrl: result.body, // HTML form to submit
      status: "pending",
    };
  }
}
```

### Native WeChat Pay Gateway

```typescript
// packages/commerce/billing/src/gateways/wechat-pay.ts
// Uses wechatpay-node-v3 (npm)

import WechatPay from "wechatpay-node-v3";

export class WechatPayGateway implements PaymentGateway {
  readonly provider = "wechat-pay" as const;
  private pay: WechatPay;

  constructor(config: WechatPayConfig) {
    this.pay = new WechatPay({
      appid: config.appId,
      mchid: config.merchantId,
      publicKey: config.publicKey,
      privateKey: config.privateKey,
    });
  }

  async createPaymentIntent(
    params: CreatePaymentParams,
  ): Promise<PaymentIntent> {
    const result = await this.pay.transactions_native({
      description: params.description,
      out_trade_no: `neb_${Date.now()}`,
      amount: {
        total: params.amount, // WeChat uses fen
        currency: "CNY",
      },
      notify_url: `${process.env.API_URL}/api/webhooks/wechat-pay`,
    });

    return {
      id: result.out_trade_no,
      qrCodeUrl: result.code_url, // Generate QR from this URL
      status: "pending",
    };
  }
}
```

### Gateway Factory

```typescript
// packages/commerce/billing/src/gateways/index.ts
export function createPaymentGateway(
  provider: "stripe" | "alipay" | "wechat-pay",
): PaymentGateway {
  switch (provider) {
    case "stripe":
      return new StripeGateway(process.env.STRIPE_SECRET_KEY!);
    case "alipay":
      return new AlipayGateway({
        appId: process.env.ALIPAY_APP_ID!,
        privateKey: process.env.ALIPAY_PRIVATE_KEY!,
        alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
      });
    case "wechat-pay":
      return new WechatPayGateway({
        appId: process.env.WECHAT_APP_ID!,
        merchantId: process.env.WECHAT_MERCHANT_ID!,
        publicKey: process.env.WECHAT_PUBLIC_KEY!,
        privateKey: process.env.WECHAT_PRIVATE_KEY!,
      });
  }
}
```

### Region-Based Payment Method Suggestion

```typescript
// packages/commerce/billing/src/utils/region-detector.ts
export function suggestPaymentMethods(
  locale: string,
  country?: string,
): PaymentMethodType[] {
  if (country === "CN" || locale === "zh") {
    return ["ALIPAY", "WECHAT_PAY", "CARD"];
  }
  return ["CARD", "BANK_TRANSFER"];
}
```

### New Environment Variables

```env
# Alipay (domestic China)
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=
ALIPAY_PUBLIC_KEY=
ALIPAY_SANDBOX=true

# WeChat Pay (domestic China)
WECHAT_APP_ID=
WECHAT_MERCHANT_ID=
WECHAT_PUBLIC_KEY=
WECHAT_PRIVATE_KEY=
WECHAT_SANDBOX=true
```

---

## Layer 7: Admin Panel (`apps/admin`)

### Problem

No platform management UI beyond third-party dashboards (Prisma Studio, Clerk, Stripe).

### Architecture

Standalone Next.js app with IP restriction and super-admin auth.

```
apps/admin/
  src/
    app/
      [lang]/
        layout.tsx              # Admin layout (sidebar, restricted access)
        page.tsx                # Admin dashboard (system overview)
        users/
          page.tsx              # User management (search, filter, disable)
          [id]/page.tsx         # User detail + activity log
        organizations/
          page.tsx              # Org management
          [id]/page.tsx         # Org detail + members + billing
        billing/
          page.tsx              # Billing overview (MRR, churn, subscriptions)
          subscriptions/page.tsx
          invoices/page.tsx
          refunds/page.tsx
        feature-flags/
          page.tsx              # Feature flag management UI
          [key]/page.tsx        # Flag detail + overrides
        system/
          page.tsx              # System health dashboard
          logs/page.tsx         # Audit log viewer (filterable)
          events/page.tsx       # Webhook event viewer
          jobs/page.tsx         # Inngest job status
        content/
          page.tsx              # Content moderation queue
          reports/page.tsx      # User reports
        analytics/
          page.tsx              # Business metrics (ClickHouse queries)
    middleware.ts               # IP allowlist + super-admin check
  package.json
```

### Access Control

```typescript
// apps/admin/src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const IP_ALLOWLIST = process.env.ADMIN_IP_ALLOWLIST?.split(",") ?? [];
const ADMIN_CLERK_ORG = process.env.ADMIN_CLERK_ORG_ID;

export default clerkMiddleware(async (auth, req) => {
  // 1. IP restriction (if configured)
  if (IP_ALLOWLIST.length > 0) {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip && !IP_ALLOWLIST.includes(ip)) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // 2. Must be authenticated
  const { userId, orgId } = await auth();
  if (!userId) {
    return auth().redirectToSignIn();
  }

  // 3. Must be member of admin org (or have super-admin metadata)
  if (ADMIN_CLERK_ORG && orgId !== ADMIN_CLERK_ORG) {
    return new Response("Unauthorized", { status: 401 });
  }
});
```

### Admin Dashboard Widgets

```typescript
// Key metrics displayed on admin home
interface AdminDashboardMetrics {
  users: { total: number; newThisWeek: number; activeToday: number };
  organizations: { total: number; paid: number; trial: number };
  revenue: { mrr: number; arr: number; churnRate: number };
  system: { apiLatencyP50: number; errorRate: number; uptime: number };
  content: { pendingModeration: number; reportsToday: number };
}
```

---

## Layer 8: Community Layer

### Problem

No user-facing community features. Vertical domain community scenario is completely unsupported.

### Architecture

New `packages/community` for core logic + community features integrated into `apps/web` and `apps/blog`.

```
packages/community/
  src/
    index.ts
    discussion/
      index.ts              # CRUD for threads, replies
      schema.ts             # Zod schemas
    profile/
      index.ts              # User profile management
      schema.ts
    moderation/
      index.ts              # Content moderation actions
      schema.ts
    reputation/
      index.ts              # Badges, points, levels
      schema.ts
    follow/
      index.ts              # Follow/unfollow users, tags, threads
      schema.ts
    notification/
      index.ts              # In-app notification system
      schema.ts
    search/
      index.ts              # Meilisearch client wrapper
      sync.ts               # Sync DB records → Meilisearch index
  package.json

packages/integrations/search/                  # New package: Meilisearch abstraction
  src/
    index.ts                # Public API: search, index, sync
    client.ts               # Meilisearch client singleton
    indexes.ts              # Index definitions (posts, discussions, users)
    sync.ts                 # Inngest functions for incremental sync
  package.json
```

### New Database Models

```prisma
// Add to packages/platform/db/prisma/schema.prisma

// ============================================
// Community
// ============================================

model UserProfile {
  id             String   @id @default(cuid())
  userId         String   @unique @map("user_id")
  displayName    String   @map("display_name")
  bio            String?  @db.Text
  avatarUrl      String?  @map("avatar_url")
  websiteUrl     String?  @map("website_url")
  location       String?
  socialLinks    Json     @default("{}") // { twitter, github, linkedin }
  isPublic       Boolean  @default(true) @map("is_public")
  reputation     Int      @default(0)
  level          Int      @default(1)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  badges         UserBadge[]
  threads        DiscussionThread[]
  replies        DiscussionReply[]
  reactions      Reaction[]

  @@index([reputation])
  @@map("user_profiles")
}

model DiscussionThread {
  id             String   @id @default(cuid())
  organizationId String?  @map("organization_id")
  authorId       String   @map("author_id")
  title          String
  slug           String   @unique
  body           String   @db.Text  // Markdown
  category       String   @db.VarChar(50)
  tags           String[] @default([])
  isPinned       Boolean  @default(false) @map("is_pinned")
  isLocked       Boolean  @default(false) @map("is_locked")
  viewCount      Int      @default(0) @map("view_count")
  replyCount     Int      @default(0) @map("reply_count")
  lastActivityAt DateTime @default(now()) @map("last_activity_at")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  author    UserProfile       @relation(fields: [authorId], references: [userId])
  replies   DiscussionReply[]
  reactions Reaction[]

  @@index([category])
  @@index([lastActivityAt])
  @@index([authorId])
  @@map("discussion_threads")
}

model DiscussionReply {
  id        String   @id @default(cuid())
  threadId  String   @map("thread_id")
  authorId  String   @map("author_id")
  parentId  String?  @map("parent_id")  // For nested replies
  body      String   @db.Text  // Markdown
  isAccepted Boolean @default(false) @map("is_accepted")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  thread    DiscussionThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  author    UserProfile      @relation(fields: [authorId], references: [userId])
  parent    DiscussionReply? @relation("ReplyTree", fields: [parentId], references: [id])
  children  DiscussionReply[] @relation("ReplyTree")
  reactions Reaction[]

  @@index([threadId])
  @@index([authorId])
  @@index([parentId])
  @@map("discussion_replies")
}

model Reaction {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  targetType String  @map("target_type") @db.VarChar(20) // thread, reply, post
  targetId  String   @map("target_id")
  emoji     String   @db.VarChar(10)  // thumbsup, heart, rocket, etc.
  createdAt DateTime @default(now()) @map("created_at")

  profile  UserProfile       @relation(fields: [userId], references: [userId])
  thread   DiscussionThread? @relation(fields: [targetId], references: [id], map: "reaction_thread")
  reply    DiscussionReply?  @relation(fields: [targetId], references: [id], map: "reaction_reply")

  @@unique([userId, targetType, targetId, emoji])
  @@index([targetType, targetId])
  @@map("reactions")
}

model Follow {
  id             String   @id @default(cuid())
  followerId     String   @map("follower_id")
  followingType  String   @map("following_type") @db.VarChar(20) // user, tag, thread
  followingId    String   @map("following_id")
  createdAt      DateTime @default(now()) @map("created_at")

  @@unique([followerId, followingType, followingId])
  @@index([followingType, followingId])
  @@map("follows")
}

model Badge {
  id          String   @id @default(cuid())
  key         String   @unique @db.VarChar(50)
  name        String
  description String
  icon        String   @db.VarChar(50)  // Emoji or icon name
  category    String   @db.VarChar(30)  // contribution, milestone, special
  points      Int      @default(0)
  criteria    Json     @default("{}")   // { type: "reply_count", threshold: 10 }
  createdAt   DateTime @default(now()) @map("created_at")

  userBadges UserBadge[]

  @@map("badges")
}

model UserBadge {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  badgeId   String   @map("badge_id")
  awardedAt DateTime @default(now()) @map("awarded_at")

  profile UserProfile @relation(fields: [userId], references: [userId])
  badge   Badge       @relation(fields: [badgeId], references: [id])

  @@unique([userId, badgeId])
  @@map("user_badges")
}

model InAppNotification {
  id          String    @id @default(cuid())
  userId      String    @map("user_id")
  type        String    @db.VarChar(50) // reply, mention, badge, follow, system
  title       String
  body        String?
  actionUrl   String?   @map("action_url")
  isRead      Boolean   @default(false) @map("is_read")
  readAt      DateTime? @map("read_at")
  metadata    Json      @default("{}")
  createdAt   DateTime  @default(now()) @map("created_at")

  @@index([userId, isRead])
  @@index([userId, createdAt])
  @@map("in_app_notifications")
}

model ModerationAction {
  id          String   @id @default(cuid())
  moderatorId String   @map("moderator_id")
  targetType  String   @map("target_type") @db.VarChar(20) // thread, reply, user
  targetId    String   @map("target_id")
  action      String   @db.VarChar(20) // warn, hide, delete, ban, unban
  reason      String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([targetType, targetId])
  @@index([moderatorId])
  @@map("moderation_actions")
}
```

### Meilisearch Integration

```typescript
// packages/integrations/search/src/client.ts
import { MeiliSearch } from "meilisearch";

let client: MeiliSearch | null = null;

export function getSearchClient(): MeiliSearch {
  if (!client) {
    client = new MeiliSearch({
      host: process.env.MEILISEARCH_URL ?? "http://localhost:7700",
      apiKey: process.env.MEILISEARCH_API_KEY,
    });
  }
  return client;
}

// packages/integrations/search/src/indexes.ts
export const INDEXES = {
  posts: {
    uid: "posts",
    primaryKey: "id",
    searchableAttributes: ["title", "body", "tags", "author.name"],
    filterableAttributes: ["category", "tags", "locale", "publishedAt"],
    sortableAttributes: ["publishedAt", "viewCount"],
  },
  discussions: {
    uid: "discussions",
    primaryKey: "id",
    searchableAttributes: ["title", "body", "tags", "author.displayName"],
    filterableAttributes: ["category", "tags", "isPinned"],
    sortableAttributes: ["lastActivityAt", "replyCount", "viewCount"],
  },
  users: {
    uid: "users",
    primaryKey: "id",
    searchableAttributes: ["displayName", "bio", "location"],
    filterableAttributes: ["level"],
    sortableAttributes: ["reputation"],
  },
} as const;
```

### Docker Compose Addition

```yaml
# Add to infra/docker/docker-compose.yml
meilisearch:
  image: getmeili/meilisearch:v1.12
  ports:
    - "7700:7700"
  environment:
    MEILI_MASTER_KEY: ${MEILISEARCH_MASTER_KEY:-masterKey123}
    MEILI_ENV: development
  volumes:
    - meilisearch_data:/meili_data

volumes:
  meilisearch_data:
```

### Real-time Chat (Pusher Integration)

```typescript
// packages/community/src/chat/index.ts
import Pusher from "pusher";

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
});

export async function sendMessage(channelId: string, message: ChatMessage) {
  await pusher.trigger(`private-chat-${channelId}`, "new-message", message);
}

export async function broadcastPresence(
  channelId: string,
  userId: string,
  action: "join" | "leave",
) {
  await pusher.trigger(`presence-chat-${channelId}`, `member-${action}`, {
    userId,
  });
}
```

### New Environment Variables

```env
# Meilisearch
MEILISEARCH_URL=http://localhost:7700
MEILISEARCH_API_KEY=masterKey123
```

---

## Layer 9: SSO / Enterprise Auth

### Problem

Clerk supports SAML SSO but it's not wired up. Enterprise B2B customers expect SSO.

### Architecture

Extend `packages/identity` with SSO configuration and SCIM sync.

```
packages/iam/identity/src/
  sso/
    index.ts              # SSO configuration API
    saml.ts               # SAML metadata parsing + assertion validation
    scim.ts               # SCIM 2.0 user provisioning endpoint
    providers.ts          # Pre-configured SSO provider templates
```

### SSO via Clerk (Recommended Path)

Clerk handles SAML/OIDC SSO at the platform level. Our code handles:

1. Per-org SSO configuration UI (in admin panel)
2. Enforcing SSO-only login per org
3. SCIM user sync webhooks

```typescript
// packages/iam/identity/src/sso/index.ts
import { clerkClient } from "@clerk/backend";

export interface SSOConfig {
  organizationId: string;
  provider: "saml" | "oidc";
  // SAML
  metadataUrl?: string;
  entityId?: string;
  ssoUrl?: string;
  certificate?: string;
  // OIDC
  clientId?: string;
  clientSecret?: string;
  issuerUrl?: string;
  // Policy
  enforceSSO: boolean; // If true, password login disabled for this org
  autoProvision: boolean; // Auto-create users from SSO
  defaultRole: "MEMBER" | "VIEWER";
}

export async function configureSSOForOrg(config: SSOConfig) {
  // Uses Clerk API to create SAML connection for the organization
  const connection =
    await clerkClient.organizations.createOrganizationSAMLConnection(
      config.organizationId,
      {
        name: "Enterprise SSO",
        domain: config.domain,
        idpEntityId: config.entityId,
        idpSsoUrl: config.ssoUrl,
        idpCertificate: config.certificate,
      },
    );
  return connection;
}
```

### New Database Model

```prisma
// Add to schema.prisma

model SSOConfiguration {
  id             String   @id @default(cuid())
  organizationId String   @unique @map("organization_id")
  provider       String   @db.VarChar(10)  // saml, oidc
  domain         String   @db.VarChar(255) // company.com
  metadataUrl    String?  @map("metadata_url")
  entityId       String?  @map("entity_id")
  ssoUrl         String?  @map("sso_url")
  certificate    String?  @db.Text
  clientId       String?  @map("client_id")
  issuerUrl      String?  @map("issuer_url")
  enforceSSO     Boolean  @default(false) @map("enforce_sso")
  autoProvision  Boolean  @default(true) @map("auto_provision")
  defaultRole    Role     @default(MEMBER) @map("default_role")
  isActive       Boolean  @default(true) @map("is_active")
  lastSyncAt     DateTime? @map("last_sync_at")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("sso_configurations")
}

model SCIMToken {
  id             String   @id @default(cuid())
  organizationId String   @map("organization_id")
  token          String   @unique @db.VarChar(64)
  description    String?
  lastUsedAt     DateTime? @map("last_used_at")
  expiresAt      DateTime  @map("expires_at")
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([organizationId])
  @@map("scim_tokens")
}
```

### SCIM 2.0 Endpoint

```typescript
// backends/gateway/src/routes/scim/index.ts
// SCIM 2.0 API for user provisioning from Identity Providers

app.get("/scim/v2/Users", scimAuth, listUsers);
app.post("/scim/v2/Users", scimAuth, createUser);
app.get("/scim/v2/Users/:id", scimAuth, getUser);
app.put("/scim/v2/Users/:id", scimAuth, updateUser);
app.patch("/scim/v2/Users/:id", scimAuth, patchUser);
app.delete("/scim/v2/Users/:id", scimAuth, deleteUser);
app.get("/scim/v2/Groups", scimAuth, listGroups);
```

### MFA Enforcement

```typescript
// packages/iam/identity/src/sso/mfa.ts
export async function enforceMFA(organizationId: string): Promise<void> {
  // Set org metadata to require MFA for all members
  await clerkClient.organizations.updateOrganization(organizationId, {
    publicMetadata: {
      requireMFA: true,
      mfaMethods: ["totp", "phone"], // Authenticator app or SMS
    },
  });
}
```

---

## Layer 10: File Upload UI

### Problem

`@nebutra/storage` has S3/R2 abstraction but no frontend components.

### Architecture

New components in `packages/ui` + presigned URL flow via `packages/storage`.

```
packages/design/ui/src/components/upload/
  FileUpload.tsx              # Drag-and-drop upload zone
  FileUploadProgress.tsx      # Upload progress indicator
  ImageCropper.tsx            # Image crop/resize before upload
  FileBrowser.tsx             # Browse uploaded files (grid/list)
  FilePreview.tsx             # Preview thumbnails (image, video, doc)
  AvatarUpload.tsx            # Circular crop for profile pictures

packages/integrations/storage/src/
  presigned.ts                # Generate presigned upload URLs
  upload-flow.ts              # Client-side upload orchestration
```

### Presigned URL Flow

```
Client                    API Gateway              R2/S3
  │                           │                      │
  │ POST /api/v1/upload/url   │                      │
  │ { filename, contentType } │                      │
  │ ─────────────────────────>│                      │
  │                           │  generatePresignedUrl │
  │                           │ ────────────────────>│
  │                           │ <────────────────────│
  │ { uploadUrl, fileId }     │                      │
  │ <─────────────────────────│                      │
  │                           │                      │
  │ PUT uploadUrl             │                      │
  │ (binary data)             │                      │
  │ ──────────────────────────────────────────────>  │
  │                           │                      │
  │ POST /api/v1/upload/confirm                      │
  │ { fileId }                │                      │
  │ ─────────────────────────>│  verify upload exists │
  │                           │ ────────────────────>│
  │ { url, metadata }         │                      │
  │ <─────────────────────────│                      │
```

### FileUpload Component

```typescript
// packages/design/ui/src/components/upload/FileUpload.tsx
'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'

interface FileUploadProps {
  accept?: Record<string, string[]>  // MIME types
  maxSize?: number                    // Bytes (default: 10MB)
  maxFiles?: number                   // Default: 1
  onUpload: (files: UploadedFile[]) => void
  onError?: (error: string) => void
  uploadEndpoint: string              // API URL for presigned URL
  children?: React.ReactNode          // Custom dropzone content
}

interface UploadedFile {
  id: string
  name: string
  url: string
  size: number
  contentType: string
}

export function FileUpload({
  accept, maxSize = 10 * 1024 * 1024, maxFiles = 1,
  onUpload, onError, uploadEndpoint, children,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<Record<string, number>>({})

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile> => {
    // 1. Get presigned URL
    const res = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: file.name, contentType: file.type }),
    })
    const { uploadUrl, fileId } = await res.json()

    // 2. Upload to R2/S3 directly
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    // 3. Confirm upload
    const confirm = await fetch(`${uploadEndpoint}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    })
    return confirm.json()
  }, [uploadEndpoint])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    const results = await Promise.all(acceptedFiles.map(uploadFile))
    setUploading(false)
    onUpload(results)
  }, [uploadFile, onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
  })

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
        transition-colors duration-200
        ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
        ${uploading ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input {...getInputProps()} />
      {children ?? (
        <div className="space-y-2">
          <p className="text-muted-foreground">
            {isDragActive ? 'Drop files here...' : 'Drag & drop files, or click to browse'}
          </p>
          <p className="text-sm text-muted-foreground">
            Max {(maxSize / 1024 / 1024).toFixed(0)}MB per file
          </p>
        </div>
      )}
    </div>
  )
}
```

### New Dependencies

```
react-dropzone           # Drag-and-drop file handling
react-image-crop         # Image cropping
```

---

## Layer 11: Discourse Forum (External Service)

### Problem

Community Layer (Layer 8) handles in-app discussions, but a full-featured user feedback forum requires battle-tested forum software. Building from scratch is wasteful.

### Architecture Decision

**Core as external dependency.** Discourse core is NOT in the monorepo. We maintain only:

- Deployment configs (Docker Compose + K8s Helm)
- Custom plugins (SSO, business logic)
- Custom themes (brand alignment)
- Locale overrides

```
Discourse Architecture in Nebutra-Sailor

┌─────────────────────────────────────────┐
│ Monorepo (repo)                         │
│                                         │
│  infra/discourse/                       │
│    ├── docker-compose.yml    (dev)      │
│    ├── helm/                 (prod)     │
│    └── scripts/              (ops)      │
│                                         │
│  custom/discourse/                      │
│    ├── plugins/              (self-built)│
│    ├── themes/               (brand)    │
│    └── locales/              (i18n)     │
│                                         │
└─────────────────────────────────────────┘
         │
         │ Deploys (image + config + plugins)
         ▼
┌─────────────────────────────────────────┐
│ Discourse Instance                      │
│   discourse/discourse:latest (official) │
│                                         │
│   ← OIDC SSO → Clerk                   │
│   ← Webhook → api-gateway              │
│   ← Meilisearch → shared search index  │
└─────────────────────────────────────────┘
```

### Directory Structure

```
infra/discourse/
  docker-compose.yml          # Dev: Discourse + PostgreSQL + Redis
  helm/
    Chart.yaml                # Bitnami Discourse Helm chart wrapper
    values.yaml               # Base values
    values-staging.yaml       # Staging overrides
    values-prod.yaml          # Production overrides (replicas, resources, ingress)
  scripts/
    backup.sh                 # pg_dump Discourse DB → R2
    restore.sh                # Restore from R2 backup
    upgrade.sh                # Pull latest image, run migrations, restart
    sync-plugins.sh           # Clone/update plugin repos into container

custom/discourse/
  plugins/
    discourse-nebutra-sso/    # Custom DiscourseConnect ↔ Clerk OIDC bridge
      plugin.rb
      config/settings.yml
    discourse-nebutra-hooks/  # Webhook integration (post events → api-gateway)
      plugin.rb
    README.md                 # Plugin development guide
  themes/
    nebutra-theme/            # Brand-aligned Discourse theme
      about.json
      common/
        header.html           # Custom header matching landing nav
        body_tag.html
      scss/
        common.scss           # CSS variables from @nebutra/theme tokens
      locales/
        en.yml
        zh_CN.yml
    README.md                 # Theme customization guide
  locales/
    server.en.yml             # Override Discourse server-side strings
    server.zh_CN.yml
    client.en.yml             # Override Discourse client-side strings
    client.zh_CN.yml
```

### Docker Compose (Development)

```yaml
# infra/discourse/docker-compose.yml
services:
  discourse:
    image: discourse/discourse:latest
    ports:
      - "4200:80"
    environment:
      DISCOURSE_HOSTNAME: localhost
      DISCOURSE_DEVELOPER_EMAILS: admin@nebutra.com
      DISCOURSE_SMTP_ADDRESS: smtp.resend.com
      DISCOURSE_SMTP_PORT: 587
      DISCOURSE_SMTP_USER_NAME: resend
      DISCOURSE_SMTP_PASSWORD: ${RESEND_API_KEY}
      # OIDC SSO via Clerk
      DISCOURSE_OPENID_CONNECT_ENABLED: true
      DISCOURSE_OPENID_CONNECT_DISCOVERY_DOCUMENT: https://${CLERK_DOMAIN}/.well-known/openid-configuration
      DISCOURSE_OPENID_CONNECT_CLIENT_ID: ${CLERK_DISCOURSE_CLIENT_ID}
      DISCOURSE_OPENID_CONNECT_CLIENT_SECRET: ${CLERK_DISCOURSE_CLIENT_SECRET}
      DISCOURSE_OPENID_CONNECT_AUTHORIZE_SCOPE: openid email profile
      DISCOURSE_OPENID_CONNECT_CLAIMS_EMAIL: email
      DISCOURSE_OPENID_CONNECT_CLAIMS_NAME: name
      DISCOURSE_OPENID_CONNECT_CLAIMS_AVATAR: picture
    volumes:
      - discourse_data:/shared
      - ./../../custom/discourse/plugins/discourse-nebutra-sso:/var/www/discourse/plugins/discourse-nebutra-sso
      - ./../../custom/discourse/plugins/discourse-nebutra-hooks:/var/www/discourse/plugins/discourse-nebutra-hooks
      - ./../../custom/discourse/themes/nebutra-theme:/var/www/discourse/themes/nebutra-theme
    depends_on:
      - discourse-db
      - discourse-redis

  discourse-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: discourse
      POSTGRES_USER: discourse
      POSTGRES_PASSWORD: discourse_dev
    volumes:
      - discourse_pgdata:/var/lib/postgresql/data
    ports:
      - "5433:5432"

  discourse-redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"

volumes:
  discourse_data:
  discourse_pgdata:
```

### K8s Helm Values (Production)

```yaml
# infra/discourse/helm/values-prod.yaml
replicaCount: 2

image:
  repository: discourse/discourse
  tag: latest # Pin to specific version in production
  pullPolicy: IfNotPresent

discourse:
  host: forum.nebutra.com
  siteName: Nebutra Community
  username: admin
  email: admin@nebutra.com

  # OIDC SSO via Clerk
  openidConnect:
    enabled: true
    discoveryDocument: "https://clerk.nebutra.com/.well-known/openid-configuration"
    clientId: "clerk_discourse_client_id" # From K8s secret
    clientSecret: "clerk_discourse_secret" # From K8s secret
    scope: "openid email profile"

  smtp:
    enabled: true
    host: smtp.resend.com
    port: 587
    user: resend
    password: "" # From K8s secret

ingress:
  enabled: true
  hostname: forum.nebutra.com
  tls: true
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod

persistence:
  enabled: true
  size: 20Gi
  storageClass: gp3

postgresql:
  enabled: true
  auth:
    database: discourse
    username: discourse
    password: "" # From K8s secret
  primary:
    persistence:
      size: 20Gi

redis:
  enabled: true
  architecture: standalone
  auth:
    enabled: false

resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 2000m
    memory: 3Gi
```

### OIDC SSO Integration with Clerk

```
Authentication Flow:

User clicks "Login" on Discourse
    │
    ▼
Discourse redirects to Clerk OIDC authorize endpoint
    │
    ▼
Clerk shows sign-in UI (same as apps/web)
    │
    ▼
User authenticates (email, Google, GitHub, SAML, etc.)
    │
    ▼
Clerk redirects back to Discourse with auth code
    │
    ▼
Discourse exchanges code for tokens via Clerk token endpoint
    │
    ▼
Discourse creates/updates user from OIDC claims:
  - sub     → Discourse external_id
  - email   → Discourse email
  - name    → Discourse name
  - picture → Discourse avatar
    │
    ▼
User is logged in — single identity across all Nebutra apps
```

**Clerk Setup:**

1. Create an OIDC Application in Clerk Dashboard
   - Name: `Nebutra Discourse`
   - Redirect URI: `https://forum.nebutra.com/auth/oidc/callback`
   - Scopes: `openid email profile`
2. Note the `client_id` and `client_secret`
3. Configure in Discourse admin or via env vars

### Custom Plugin: Webhook Bridge

```ruby
# custom/discourse/plugins/discourse-nebutra-hooks/plugin.rb
# frozen_string_literal: true

# name: discourse-nebutra-hooks
# about: Sends post/topic events to Nebutra API Gateway
# version: 0.1.0
# authors: Nebutra

after_initialize do
  # Post created → notify api-gateway
  DiscourseEvent.on(:post_created) do |post, opts, user|
    Jobs.enqueue(:nebutra_webhook, {
      event: 'post.created',
      post_id: post.id,
      topic_id: post.topic_id,
      user_id: user.id,
      user_email: user.email,
    })
  end

  # Topic created → notify api-gateway
  DiscourseEvent.on(:topic_created) do |topic, opts, user|
    Jobs.enqueue(:nebutra_webhook, {
      event: 'topic.created',
      topic_id: topic.id,
      user_id: user.id,
      category: topic.category&.name,
    })
  end

  # Background job to POST webhooks
  module Jobs
    class NebutraWebhook < ::Jobs::Base
      def execute(args)
        uri = URI(SiteSetting.nebutra_api_gateway_url + '/api/webhooks/discourse')
        Net::HTTP.post(
          uri,
          args.to_json,
          {
            'Content-Type' => 'application/json',
            'X-Discourse-Webhook-Secret' => SiteSetting.nebutra_webhook_secret,
          }
        )
      end
    end
  end
end
```

### Custom Theme: Brand Alignment

```scss
// custom/discourse/themes/nebutra-theme/scss/common.scss
// Sync with @nebutra/theme tokens

:root {
  // Map Nebutra theme tokens → Discourse CSS variables
  --primary: var(--nebutra-primary, #7c3aed);
  --secondary: var(--nebutra-background, #09090b);
  --tertiary: var(--nebutra-accent, #a78bfa);
  --quaternary: var(--nebutra-secondary, #06b6d4);
  --header_background: var(--nebutra-card, #18181b);
  --header_primary: var(--nebutra-foreground, #fafafa);
  --highlight: var(--nebutra-warning, #f59e0b);
  --danger: var(--nebutra-destructive, #ef4444);
  --success: var(--nebutra-success, #22c55e);
  --love: var(--nebutra-destructive, #ef4444);
}

// Font alignment
body {
  font-family: var(--nebutra-font-sans, "Inter, system-ui, sans-serif");
}

// Code blocks
code,
pre {
  font-family: var(--nebutra-font-mono, "JetBrains Mono, monospace");
}
```

### API Gateway Webhook Handler

```typescript
// backends/gateway/src/routes/webhooks/discourse.ts
import { Hono } from "hono";
import { z } from "zod";

const discourseWebhook = new Hono();

const DiscourseEventSchema = z.object({
  event: z.enum(["post.created", "topic.created", "user.created"]),
  post_id: z.number().optional(),
  topic_id: z.number().optional(),
  user_id: z.number().optional(),
  user_email: z.string().optional(),
  category: z.string().optional(),
});

discourseWebhook.post("/", async (c) => {
  // Verify webhook secret
  const secret = c.req.header("X-Discourse-Webhook-Secret");
  if (secret !== process.env.DISCOURSE_WEBHOOK_SECRET) {
    return c.json({ error: "Invalid secret" }, 401);
  }

  const event = DiscourseEventSchema.parse(await c.req.json());

  switch (event.event) {
    case "topic.created":
      // Sync to Meilisearch, send notifications, update analytics
      break;
    case "post.created":
      // Index in Meilisearch, trigger notification to thread followers
      break;
  }

  return c.json({ ok: true });
});

export { discourseWebhook };
```

### Discourse Meilisearch Sync

Discourse content synced to shared Meilisearch for unified search across blog + forum + docs.

```typescript
// packages/integrations/search/src/indexes.ts — add Discourse index
export const INDEXES = {
  // ... existing indexes
  forum: {
    uid: "forum",
    primaryKey: "id",
    searchableAttributes: ["title", "body", "category", "tags", "author.name"],
    filterableAttributes: ["category", "tags", "solved", "pinned"],
    sortableAttributes: ["createdAt", "replyCount", "viewCount", "likeCount"],
  },
} as const;
```

### Discourse Environment Variables

```env
# Discourse
DISCOURSE_URL=http://localhost:4200          # Dev
DISCOURSE_API_KEY=                            # Admin API key (for sync)
DISCOURSE_WEBHOOK_SECRET=                     # Webhook verification

# Clerk OIDC for Discourse
CLERK_DOMAIN=clerk.nebutra.com
CLERK_DISCOURSE_CLIENT_ID=
CLERK_DISCOURSE_CLIENT_SECRET=
```

### Domain Routing (Update Cloudflare)

| Subdomain         | Service                 | Cache    |
| ----------------- | ----------------------- | -------- |
| forum.nebutra.com | Discourse (K8s ingress) | No cache |

### Operations Scripts

```bash
# infra/discourse/scripts/upgrade.sh
#!/bin/bash
set -euo pipefail

echo "=== Discourse Upgrade ==="

# 1. Backup before upgrade
bash "$(dirname "$0")/backup.sh"

# 2. Pull latest image
docker pull discourse/discourse:latest

# 3. Restart (Docker Compose)
if [ "${DEPLOY_MODE:-docker}" = "docker" ]; then
  cd "$(dirname "$0")/.."
  docker compose pull
  docker compose up -d
  docker compose exec discourse rake db:migrate
fi

# 4. Or upgrade via Helm (K8s)
if [ "${DEPLOY_MODE:-docker}" = "k8s" ]; then
  helm upgrade discourse bitnami/discourse \
    -f helm/values.yaml \
    -f "helm/values-${ENV:-prod}.yaml" \
    --namespace nebutra
fi

echo "=== Upgrade complete ==="
```

### Relationship to Layer 8 (Community)

Layer 8 (`packages/community`) handles **in-app** lightweight community features:

- In-app discussions (product feedback, support threads)
- User profiles and reputation
- Reactions and follows
- In-app notifications

Discourse handles **dedicated forum** scenarios:

- Long-form technical discussions
- Knowledge base / Q&A
- Community governance
- Public-facing support forum

**Integration points:**

- Shared user identity (Clerk OIDC → same user across both)
- Shared search index (Meilisearch → both in-app and forum content searchable)
- Webhook bridge (Discourse events → api-gateway → in-app notifications)
- Theme alignment (Discourse theme CSS vars match @nebutra/theme tokens)

---

## New Package & App Summary

### New Packages (4)

| Package           | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| `packages/preset` | Scenario preset config, turbo integration, feature mapping      |
| `packages/theme`  | CSS custom property tokens, presets, ThemeProvider              |
| `packages/growth` | Referral, waitlist, changelog, feedback, A/B testing, OG images |
| `packages/search` | Meilisearch client abstraction, index definitions, sync         |

### New Apps (2)

| App          | Purpose                                                   |
| ------------ | --------------------------------------------------------- |
| `apps/blog`  | MDX + Sanity blog with RSS, JSON-LD, newsletter, comments |
| `apps/admin` | Platform admin panel with IP restriction                  |

### Extended Packages (5)

| Package              | Extensions                                                          |
| -------------------- | ------------------------------------------------------------------- |
| `packages/billing`   | Payment gateway abstraction, Alipay/WeChat native SDKs              |
| `packages/identity`  | SSO config, SCIM 2.0, MFA enforcement                               |
| `packages/community` | Discussion, profiles, moderation, reputation, follow, notifications |
| `packages/ui` | Dashboard shell, DataTable, charts, FileUpload, empty states        |
| `packages/storage`   | Presigned URL upload flow                                           |

### Schema Additions (~250 new lines)

- ReferralCode, Referral, WaitlistEntry, ChangelogEntry, FeedbackSubmission (Growth)
- Experiment, ExperimentAssignment (A/B Testing)
- UserProfile, DiscussionThread, DiscussionReply, Reaction, Follow (Community)
- Badge, UserBadge, InAppNotification, ModerationAction (Community)
- SSOConfiguration, SCIMToken (Enterprise Auth)

### New External Services

- Discourse forum (Docker Compose dev + K8s Helm prod, OIDC via Clerk)
- Meilisearch search engine (Docker container)

### New Infrastructure Config

- `infra/discourse/` — Docker Compose + Helm chart + ops scripts
- `custom/discourse/` — plugins, themes, locale overrides
- Meilisearch container in docker-compose
- Alipay/WeChat environment variables
- Admin IP allowlist
- Discourse environment variables + Clerk OIDC config

---

## Implementation Priority

### Phase 1 — Foundation (P0)

1. `packages/preset` — Scenario Preset System
2. `packages/theme` — Theme Engine
3. Wire into existing apps (landing, web)

### Phase 2 — Core Apps (P1)

1. Dashboard skeleton in `apps/web`
2. `apps/blog` — Blog/Content App
3. Sanity schemas for blog content

### Phase 3 — Monetization & Growth (P2)

1. `packages/growth` — Referral, waitlist, changelog, feedback
2. Payment gateway abstraction + Alipay/WeChat
3. `apps/admin` — Admin Panel

### Phase 4 — Community & Enterprise (P3)

1. `packages/search` + Meilisearch setup
2. `packages/community` — Full community layer
3. Discourse deployment + OIDC SSO + custom plugins/themes
4. SSO/SCIM in `packages/identity`
5. File upload components

### Phase 5 — Polish

1. A/B testing framework
2. OG image generation
3. Storybook stories for all new components
4. Discourse ↔ Meilisearch sync + unified search UI

---

## Testing Strategy

| Layer     | Unit Tests                                       | Integration Tests                            | E2E Tests                                          |
| --------- | ------------------------------------------------ | -------------------------------------------- | -------------------------------------------------- |
| Preset    | Config parsing, merging, turbo filter generation | Preset → feature flags resolution            | Build with preset, verify only selected apps built |
| Theme     | Token → CSS conversion, contrast checking        | ThemeProvider renders correct CSS vars       | Visual regression (Chromatic/Playwright)           |
| Dashboard | DataTable sorting/filtering, Widget rendering    | DashboardShell layout composition            | Navigate dashboard, interact with table            |
| Blog      | MDX compilation, RSS generation, JSON-LD         | Sanity query → post rendering                | Visit blog, read post, subscribe newsletter        |
| Growth    | Referral code generation, A/B assignment         | Waitlist flow, referral reward               | Join waitlist, use referral code                   |
| Payments  | Gateway interface compliance                     | Stripe/Alipay/WeChat payment intent creation | Checkout flow (sandbox)                            |
| Admin     | Access control, IP filtering                     | CRUD operations on admin entities            | Login as admin, manage users                       |
| Community | Thread CRUD, reputation calc, moderation         | Discussion flow, notification delivery       | Post thread, reply, react, search                  |
| SSO       | SAML assertion parsing, SCIM schema validation   | SSO config → Clerk API                       | SSO login flow (with test IdP)                     |
| Upload    | Dropzone rendering, progress tracking            | Presigned URL → R2 upload                    | Upload file, verify in browser                     |
| Discourse | Plugin unit tests (Ruby)                         | OIDC SSO flow, webhook delivery              | Login via Clerk, post topic, verify search sync    |
