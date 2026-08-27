# @nebutra/blog

Framework-agnostic blog domain rules shared by Nebutra content surfaces.

This package owns:

- Portable blog and PortableText types
- Language helpers
- Reading-time estimation
- Related-post ranking and URL segment helpers
- Table-of-contents extraction
- Copyable Markdown serialization
- Template placeholder detection and decoration helpers
- Markdown table recovery for legacy PortableText imports
- Curated fallback cover selection and deterministic blur placeholders

It intentionally does not own:

- Next.js routes, metadata, cache, or image rendering
- Sanity clients or queries
- Comments, likes, moderation, or login-dependent APIs
- Marketing page layout and navigation

## Validation

```bash
pnpm --filter @nebutra/blog test
pnpm --filter @nebutra/blog typecheck
```
