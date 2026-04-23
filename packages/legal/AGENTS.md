# AGENTS.md — packages/legal

Execution contract for Nebutra's legal and consent package.

## Scope

Applies to everything under `packages/legal/`.

This package owns legal document metadata, checked-in legal content, client-side
consent helpers, and reusable React compliance components. It is currently a
WIP policy layer, not a fully integrated production subsystem.

## Source Of Truth

- Public package surface and subpath exports: `package.json`, `src/index.ts`
- Canonical legal document metadata and company/compliance configuration:
  `src/documents/config.ts`, `src/documents/index.ts`
- Checked-in legal content:
  `content/en/*.mdx`
- Consent types and request/record contracts:
  `src/types/index.ts`
- Client-side consent and cookie helper behavior:
  `src/consent/service.ts`, `src/consent/index.ts`
- Reusable UI surfaces for consent and footer links:
  `src/components/*.tsx`, `src/components/index.ts`

If document metadata, consent semantics, or exported UI behavior changes,
update the source of truth here instead of patching consumers.

## Contract Boundaries

- Keep legal content and legal metadata separate. The MDX files under
  `content/` are the canonical document bodies; `src/documents/config.ts`
  defines slugs, versions, required-ness, and related-doc relationships.
- Treat the package's WIP status as real. `package.json` already declares gaps
  around app integration, consent persistence, and document versioning; do not
  write scoped guidance that assumes those parts are finished.
- Keep `src/types/index.ts` as the canonical contract for consent, cookie, and
  legal-document shapes. If those semantics change, align exports and consumer
  expectations intentionally.
- Preserve the split between client-side helpers and server persistence.
  `src/consent/service.ts` currently owns localStorage/cache behavior and API
  client helpers; it should not silently become the persistence layer itself.
- Keep React components presentational and package-scoped. App routing, page
  composition, and backend policy enforcement belong outside this package.
- Do not patch rendered `dist/` output or app-local copies of legal text. If
  a policy changes, update the checked-in content and metadata together.

## Generated And Derived Files

- `dist/` is build output from `tsup`. Do not hand-edit it.
- Temporary localStorage state, transient consent API payloads, and build
  artifacts are derived files.
- If built output needs to change, update the source files above and rebuild.

## Validation

- Export or legal type-surface changes:
  `pnpm --filter @nebutra/legal typecheck`
- Because this package has no package-local tests yet, be conservative when
  changing consent behavior or document metadata and prefer narrow consumer
  verification before widening the change.
