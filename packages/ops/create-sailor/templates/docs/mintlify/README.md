# {PRODUCT_NAME} Docs

Documentation site for {PRODUCT_NAME}, built with [Mintlify](https://mintlify.com/).

## Develop

```bash
pnpm install
pnpm dev          # http://localhost:3001
```

## Add a page

1. Create an `.mdx` file at the root or under a subdirectory
2. Add it to `navigation` in `mint.json`

## Deploy

Mintlify deploys from your `main` branch. Connect the repo at [dashboard.mintlify.com](https://dashboard.mintlify.com) — no build step needed.

## Check broken links

```bash
pnpm broken-links
```
