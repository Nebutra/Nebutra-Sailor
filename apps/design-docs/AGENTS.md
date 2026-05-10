# AGENTS.md — apps/design-docs

Scoped execution contract for the internal design docs app.

## Scope

This app owns the Fumadocs-based design documentation surface for Nebutra.

It owns:

- docs routing and page composition under `src/app`
- checked-in documentation content under `content/`
- MDX and docs generation config in `source.config.ts`
- local remark helpers and sync/build scripts under `lib/` and `scripts/`

It does not own shared UI primitives, tokens, or package contracts exposed from
workspace packages.

## Source Of Truth

Use these files as the canonical source before editing behavior:

- `package.json` for runtime and validation commands
- `source.config.ts` for docs collection shape, frontmatter schema, and MDX
  processing
- `content/` for checked-in docs content
- `src/app/[lang]/` for app shell, routing, and docs page behavior
- `lib/remark-component.ts` and `scripts/build-registry.mjs` for local docs
  transformations and registry generation

Do not treat `CONTRIBUTING.md` or generated caches under `.next/` as the
implementation truth.

## Contract Boundaries

- Content changes belong in `content/`; routing and rendering changes belong in
  `src/app/`.
- Frontmatter and MDX plugin behavior must stay aligned with `source.config.ts`.
- `openapi.json` is an imported docs input for this app, not a place to invent
  new API behavior.
- `src/app/llms.txt/route.ts` and `src/app/llms-full.txt/route.ts` are derived
  presentation surfaces and should stay consistent with the checked-in docs
  source.

## Generated And Derived Files

Treat these as derived artifacts:

- `.next/`
- `node_modules/`
- generated caches created by Fumadocs or TypeScript tooling

If docs generation output is wrong, update the checked-in docs source or local
generator script instead of editing build output.

## Validation

Run the smallest credible validation after changes:

- `pnpm --filter @nebutra/design-docs typecheck`
- `pnpm --filter @nebutra/design-docs lint:links`
- `pnpm --filter @nebutra/design-docs build`

## Registry Hosting (`ui.nebutra.com`)

This app double-serves as the public shadcn-style Registry for `@nebutra/ui`.

### Where the manifests come from

- `packages/design/ui/scripts/build-registry.ts` — TIER B component manifests
- `apps/design-docs/scripts/build-registry.mjs` — preview-demo manifests
- Both are wired into the `predev` and `prebuild` lifecycle scripts of this app.
- Outputs:
  - `public/r/<name>.json` — single-component shadcn manifest (served as
    `https://ui.nebutra.com/r/<name>.json`)
  - `public/registry.json` — TIER B index (served at the apex)
  - `public/previews-index.json` — internal preview-demo index

### Public routes

- `/registry` — index UI page listing all TIER B components
- `/registry/<name>` — single-component detail page with copy-paste install command
- `/registry.json` and `/r/<name>.json` — static JSON served by Next.js out
  of `public/`

CORS, caching, and `Content-Type` headers for the JSON endpoints are pinned in
`vercel.json`.

### Vercel domain binding (manual, not automated)

The custom domain `ui.nebutra.com` is **not** wired up automatically. After
deploying this project:

1. Open the Vercel dashboard for the `@nebutra/design-docs` project.
2. **Settings → Domains** → "Add Domain" → enter `ui.nebutra.com`.
3. Choose the production environment.
4. Update the DNS record at the domain registrar:
   - Type: `CNAME`
   - Name: `ui`
   - Value: `cname.vercel-dns.com`
5. Wait for Vercel to provision the certificate (usually <1 min).
6. Verify by curling the registry index:
   `curl https://ui.nebutra.com/registry.json`

The site will continue to be reachable via its default Vercel URL (and the
existing `design.nebutra.com` if still bound) until a redirect/canonical
strategy is decided.
