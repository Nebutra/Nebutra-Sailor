# {PRODUCT_NAME} Docs

Documentation site for {PRODUCT_NAME}, built with [Nextra v4](https://nextra.site/) (App Router) + Next.js 16.

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3001
```

## Add a page

Create a `.mdx` file under `content/`:

```mdx
---
title: My new page
---

# My new page

content here
```

That's it — file-based routing handles the rest.

## Deploy

Any Next.js host: Vercel, Cloudflare Pages, Railway, self-hosted Node.

```bash
pnpm build
pnpm start
```
