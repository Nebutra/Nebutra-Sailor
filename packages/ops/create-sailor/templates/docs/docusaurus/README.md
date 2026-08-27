# {PRODUCT_NAME} Docs

Documentation site for {PRODUCT_NAME}, built with [Docusaurus 3](https://docusaurus.io/).

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3001
```

## Add a page

1. Drop a `.md` or `.mdx` file under `docs/`
2. Add the path to `sidebars.ts` (or use auto-generated sidebars)

## Deploy

```bash
pnpm build        # static output -> build/
pnpm serve        # preview locally
```

The `build/` directory can be hosted on any static host (Vercel, Cloudflare Pages, S3, GitHub Pages).
