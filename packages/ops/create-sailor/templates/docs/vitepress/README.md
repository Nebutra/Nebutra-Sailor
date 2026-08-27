# {PRODUCT_NAME} Docs

Documentation site for {PRODUCT_NAME}, built with [VitePress](https://vitepress.dev/).

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3001
```

## Add a page

Drop a `.md` file in any directory, then register it in the `sidebar` of `.vitepress/config.ts`.

## Deploy

```bash
pnpm build        # static output -> .vitepress/dist
pnpm preview      # local preview
```

Host the `.vitepress/dist` directory on any static host (Vercel, Cloudflare Pages, GitHub Pages, S3, etc.).
