# Nebutra Sailor — Landing Page

Marketing site for Nebutra Sailor at [nebutra.com](https://nebutra.com).

## Design Specification

**See [`DESIGN.md`](./DESIGN.md) for the complete design specification including:**

- Product positioning & narrative strategy
- Page structure & ASCII wireframes
- Component mapping
- Motion design system
- Design tokens usage
- Mental model & conversion paths
- Content guidelines
- Implementation notes

## Development

```bash
# From monorepo root
pnpm dev --filter=landing

# Or from this directory
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view.

## Structure

```
src/
├── app/
│   └── [lang]/
│       ├── (marketing)/      # Main landing page
│       └── (legal)/          # Legal pages (privacy, terms, etc.)
├── components/
│   ├── landing/              # Landing page sections
│   └── marketing/            # Reusable marketing components
└── lib/
    ├── landing-content.ts    # Content constants
    └── i18n/                  # Internationalization
```

## Content

All landing page copy is centralized in [`src/lib/landing-content.ts`](./src/lib/landing-content.ts).

## Components

Landing page sections compose primitives from:

- `@nebutra/ui/components` — UI components
- `@nebutra/theme` — Design tokens and theming
- `@nebutra/brand` — Brand assets

See [`src/components/landing/index.ts`](./src/components/landing/index.ts) for the component dependency map.

## Deployment

Deployed to Vercel. See [`vercel.json`](./vercel.json) for configuration.
