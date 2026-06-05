# @nebutra/ui

Nebutra design-system UI primitives, layouts, patterns, hooks, typography, and
token-integrated React components.

This package is the shared UI layer for Nebutra products. It combines Nebutra
runtime tokens with Nebutra primitives, selected compatibility bridges, icons, and
product-ready SaaS composition patterns.

## Installation

```bash
pnpm add @nebutra/ui
```

For app rendering, load Nebutra runtime tokens once at the application root:

```tsx
import "@nebutra/tokens/styles.css";
```

## Usage

### Theme Bridge

Use `NebutraThemeProvider` when consuming compatibility surfaces that depend on Lobe UI or Ant Design:

```tsx
import { NebutraThemeProvider } from "@nebutra/ui";
import { Button } from "@nebutra/ui/components";

export function App() {
  return (
    <NebutraThemeProvider appearance="auto">
      <Button type="primary">Create workspace</Button>
    </NebutraThemeProvider>
  );
}
```

### Product Layouts

```tsx
import { AppShell, EmptyState, PageHeader } from "@nebutra/ui/layout";

export function DashboardEmptyState() {
  return (
    <AppShell>
      <PageHeader title="Projects" description="Manage reusable product surfaces." />
      <EmptyState title="No projects yet" description="Create one to start shipping." />
    </AppShell>
  );
}
```

### Components And Patterns

```tsx
import { AnimateIn, Button } from "@nebutra/ui/components";
import { DashboardPanel } from "@nebutra/ui/patterns";

export function WorkspaceSurface() {
  return (
    <DashboardPanel
      title="Workspace"
      description="Reusable command surfaces for product teams."
    >
      <AnimateIn preset="fadeUp">
        <Button type="primary">Open command center</Button>
      </AnimateIn>
    </DashboardPanel>
  );
}
```

### Icons

```tsx
import { OpenAI, Search, Settings } from "@nebutra/ui/icons";

<OpenAI size={24} />;
<Search size={20} />;
<Settings size={20} />;
```

## Exports

| Path | Description |
| --- | --- |
| `@nebutra/ui` | Theme bridge plus selected common icon exports |
| `@nebutra/ui/components` | Nebutra components, chat input/list surfaces, animation helpers, AI prompt box, node graph canvas, and product widgets |
| `@nebutra/ui/layout` | App shell, page header, status, section, and empty/loading/error states |
| `@nebutra/ui/layouts` | Section container, themed section, and bento grid layouts |
| `@nebutra/ui/icons` | Lobe, Lucide, and Nebutra icon exports |
| `@nebutra/ui/theme` | `NebutraThemeProvider` and compatibility theme bridge types |
| `@nebutra/ui/primitives` | Low-level UI primitives and visual building blocks |
| `@nebutra/ui/primitives/canonical` | Canonical primitive token exports |
| `@nebutra/ui/patterns` | SaaS dashboard, command, card, terminal, QA, sidebar, and workspace patterns |
| `@nebutra/ui/typography` | Font utilities and typography tokens |
| `@nebutra/ui/typography/fonts.css` | Font-face CSS for Nebutra typography |
| `@nebutra/ui/hooks` | Responsive, focus, undo, hotkey, media query, and interaction hooks |
| `@nebutra/ui/utils` | Shared utilities such as `cn` |
| `@nebutra/ui/tailwind.preset` | Tailwind preset integration |

## Token Architecture

Runtime design tokens live in `@nebutra/tokens/styles.css` as CSS variables.
Use Tailwind classes backed by those variables, or `var()` directly in places
where Tailwind is not available.

```tsx
<div className="bg-primary text-foreground border-border" />
<div style={{ color: "var(--color-primary)" }} />
```

Source-of-truth flow:

```text
@nebutra/brand  -> brand primitives
@nebutra/tokens -> runtime CSS variables and theme provider primitives
@nebutra/ui     -> token-consuming components, layouts, hooks, and patterns
```

## Repository Model

The canonical source for this package lives in the Nebutra Sailor monorepo at
`packages/design/ui`. Public subrepo mirrors are generated from that source for
discovery, standalone cloning, and contribution intake.

## License

MIT

AI provider and third-party icons may be subject to their respective trademark
guidelines.
