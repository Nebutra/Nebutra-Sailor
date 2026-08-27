# AGENTS.md — packages/blog

Execution contract for Nebutra's reusable blog package.

## Scope

Applies to everything under `packages/commerce/blog/`.

This package owns framework-agnostic blog content rules: portable post types,
PortableText normalization helpers, table-of-contents extraction, copy-text
serialization, reading-time estimation, related-post ranking, URL segment
helpers, language helpers, and fallback cover selection. It is not a Next.js
route layer, Sanity client, auth surface, or comments/reactions backend.

## Source Of Truth

- Public package surface: `package.json`, `src/index.ts`
- Portable blog contracts: `src/types.ts`
- Content parsing, TOC, copy, and reading-time behavior: `src/content.ts`
- Fallback cover mapping and placeholder generation: `src/covers.ts`
- Package-local contract coverage: `src/__tests__/content.test.ts`

If a reusable blog rule changes, update the package source and tests instead of
forking app-local helpers.

## Contract Boundaries

- Keep this package free of React, Next.js, browser globals, and Sanity client
  imports. Apps own routing, caching, metadata, image rendering, and CMS fetches.
- Treat `PortableTextBlock`, `PortableTextSpan`, `BlogPostBase`, and
  `BlogPostWithSource` as portable contracts. Prefer additive changes.
- Keep fallback cover facts and deterministic placeholders centralized here so
  published articles do not drift across marketing surfaces.
- Comments, likes, moderation, and login-dependent APIs belong outside this
  package until their auth and persistence boundaries are stable.

## Validation

- Blog contract changes:
  `pnpm --filter @nebutra/blog test`
- Export or type-surface changes:
  `pnpm --filter @nebutra/blog typecheck`

## Generated And Derived Files

This package currently exports source directly and has no checked-in build
output. Do not hand-edit future `dist/`, coverage, or temporary artifacts.
