# Crawl budget & locale indexation

**Visibility:** G6, G8  
**Last updated:** 2026-07-27

## Sitemap shape

Landing uses a **sharded sitemap**:

- Index: `/sitemap.xml`
- Children: `/sitemap/<locale>.xml` via `generateSitemaps()`

This keeps each child small and reports indexation health per language (G6).

## Soft-duplicate locales (G8)

Locales whose message catalogs are still largely English-seeded must not flood
the index as near-duplicates.

Policy:

1. **Publication set** (`isPublishedIn` / `defaultPublicationSet`) already drives
   `noindex` for non-member locales on a given URL.
2. **Sitemap membership** follows the same sets — non-published locales are
   omitted from `<xhtml:link>` clusters and from primary lastmod rows.
3. Translation quality threshold for *adding* a locale to default publication
   sets: human review or ≥70% non-en string divergence (optional CI later).

## Measurement

```bash
# Approximate entry count for one locale shard (dev)
pnpm --filter @nebutra/landing exec vitest run src/app/__tests__/sitemap.test.ts
```

If a single shard exceeds ~10k URLs or 10MB, further split by section
(features/blog/static) before raising the locale count.
