# @nebutra/icons

541 Geist icons packaged as typed TypeScript React components.

## Design Intent

Icons are scraped from the Vercel Geist design system and generated via an SVGR pipeline (`scripts/generate.ts`). Each icon is an individual TSX component that accepts standard SVG props, enabling tree-shaking at the bundler level — importing one icon does not bundle the other 540.

The generation script handles duplicate CSS-in-JSX style keys present in some Geist SVG sources, producing valid component output without manual post-processing.

See `apps/storybook` (Foundation/Icons story) for the full visual gallery.

## Usage

```tsx
import { IconGitHub, IconVercel } from "@nebutra/icons";

<IconGitHub width={20} height={20} />
<IconVercel className="text-foreground" />
```

## Regenerating Icons

```bash
pnpm --filter @nebutra/icons generate
pnpm --filter @nebutra/icons build
```
