---
sidebar_position: 2
---

# Develop

```bash
pnpm dev          # http://localhost:3001
```

The site rebuilds on file change. New pages: drop a `.md` or `.mdx` under `docs/` and add it to `sidebars.ts`.

## Build for production

```bash
pnpm build
pnpm serve
```

The static output is written to `build/` — host it on any CDN.
