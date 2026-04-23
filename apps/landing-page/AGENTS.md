# AGENTS.md — apps/landing-page

Scoped execution contract for the public marketing site.

## Scope

This app owns Nebutra's public landing and marketing surface.

It owns:

- localized routing, metadata, and page composition under `src/app`
- locale loading and request config under `src/i18n`
- checked-in translations under `messages/`
- app-local marketing orchestration under `src/lib` and `src/components`

It does not own shared tokens, brand primitives, marketing package contracts, or
shared email/auth/billing package behavior.

## Source Of Truth

Use these files as the canonical source before editing behavior:

- `package.json` for runtime and validation commands
- `src/app/` for routing, metadata, sitemap, robots, and page behavior
- `src/i18n/` and `messages/` for locale resolution and translations
- `next.config.ts` for app runtime configuration
- `src/lib/landing-content` and other app-local content orchestrators for copy
  and marketing composition

Do not treat `README.md`, `.next/`, or translated build output as implementation
truth.

## Contract Boundaries

- Locale behavior must stay aligned between `src/i18n/` and `messages/`; do not
  hardcode per-page translation logic that bypasses that layer.
- Metadata routes such as `sitemap`, `robots`, and social image routes are
  public contract surfaces and should remain consistent with the site-wide
  content model.
- Shared marketing primitives belong in workspace packages; app-only layout and
  orchestration belong here.
- If a change affects billing, auth, or email semantics, update the owning
  package contract rather than forking behavior inside the landing app.

## Generated And Derived Files

Treat these as derived artifacts:

- `.next/`
- `node_modules/`

Do not hand-edit generated build output. If translated or rendered output is
wrong, update the checked-in source in `src/` or `messages/`.

## Validation

Run the smallest credible validation after changes:

- `pnpm --filter @nebutra/landing-page typecheck`
- `pnpm --filter @nebutra/landing-page test`
- `pnpm --filter @nebutra/landing-page build`
