# {PRODUCT_NAME} Docs

Documentation site for {PRODUCT_NAME}, built with [Fumadocs](https://fumadocs.vercel.app/) + Next.js 16 + Tailwind v4.

## Run locally

```bash
pnpm --filter @nebutra/docs dev
```

Opens on http://localhost:3001.

## Edit content

MDX source lives in `content/docs/`. Each file becomes a page under `/docs/<slug>`.

- Add a new page → create `content/docs/my-page.mdx`
- Control sidebar order → edit `content/docs/meta.json`
- Use built-in components (`<Cards>`, `<Card>`, `<Tabs>`, `<Tab>`, `<Callout>`, etc.) directly in MDX — they come from `fumadocs-ui/mdx`.

## Customize

- **Branding / colors**: wired to `@nebutra/tokens` via `app/global.css`. Edit tokens centrally, not here.
- **Sidebar / nav**: `app/docs/layout.tsx` — `DocsLayout` props.
- **Search**: `app/api/search/route.ts` auto-indexes all MDX via `createFromSource`.
- **MDX plugins**: `source.config.ts` → `mdxOptions`.

Full Fumadocs reference: https://fumadocs.vercel.app/docs.

## 2026 docs best practices

This template follows Nebutra docs best-practices, encoded as MDX comments inline in each starter page:

- **Home** — hero + 3-6 cards, no marketing fluff
- **Getting Started** — single goal: 5-minute first example (Install → Initialize → Hello World → Next steps)
- **Concepts** — explains the "why" / mental model, not steps, not APIs
- **API Reference** — auto-generated from OpenAPI; every endpoint has method badge + params + schema + multi-language examples

When regenerating the API reference:

```bash
pnpm sailor add openapi
```

See `/docs/plans/2026-04-14-create-sailor-roadmap.md` in the Sailor monorepo for the full rationale.
