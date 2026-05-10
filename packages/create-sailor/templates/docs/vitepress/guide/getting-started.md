# Getting started

## Install

```bash
pnpm install
```

## Develop

```bash
pnpm dev          # http://localhost:3001
```

## Add a page

Drop a `.md` file under any directory and add it to the `sidebar` in `.vitepress/config.ts`. File-based routing handles the URL.

## Build for production

```bash
pnpm build        # static output -> .vitepress/dist
pnpm preview      # serve the built output locally
```

The `.vitepress/dist` directory is the static output — host on Vercel, Cloudflare Pages, GitHub Pages, S3, or any other static host.
