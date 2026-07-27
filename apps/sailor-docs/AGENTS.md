# AGENTS.md — apps/sailor-docs

Scoped execution contract for the Sailor product docs app.

## Scope

This app owns the Fumadocs-based Sailor documentation surface.

It owns:

- docs routing and page composition under `src/app`
- checked-in docs content under `content/`
- MDX and docs generation config in `source.config.ts`
- app-local docs helpers under `lib/` and `scripts/`

It does not own shared UI, tokens, or package-level product behavior defined in
workspace packages.

## Source Of Truth

Use these files as the canonical source before editing behavior:

- `package.json` for runtime and validation commands
- `source.config.ts` for docs collection shape, frontmatter schema, and MDX
  processing
- `content/` for checked-in documentation content
- `src/app/[lang]/` for app shell, routing, and docs page behavior
- `lib/remark-component.ts` for local MDX component transforms

Do not treat `.next/`, generated caches, or descriptive docs like
`CONTRIBUTING.md` as implementation truth.

## Contract Boundaries

- Content changes belong in `content/`; rendering, routing, and shell behavior
  belong in `src/app/`.
- Frontmatter schema and MDX plugin behavior must stay aligned with
  `source.config.ts`.
- `openapi.json` is an imported docs input, not the place to invent product API
  behavior.
- `src/app/llms.txt/route.ts` and `src/app/llms-full.txt/route.ts` are derived
  presentation surfaces and should reflect the checked-in docs content.

## Generated And Derived Files

Treat these as derived artifacts:

- `.next/`
- `node_modules/`
- generated caches created by Fumadocs or TypeScript tooling

If generated docs output is wrong, change the checked-in docs source or local
generator code instead of editing build output.

## Nav logo (product chrome)

Nav title logo is **图形 / 文字解耦** — do not collapse back to one horizontal SVG.

| Layer | Light | Dark |
|-------|-------|------|
| Mark | `logo-color.svg` multi-path VI (`next/image`) | `LogomarkSVG` mono white |
| Wordmark | `WordmarkEnSVG` + neutral text token | same + `dark:!text-white` |

Source: `src/app/[lang]/layout.tsx`. Brand rationale and anti-patterns:
`packages/design/brand/README.md` → “Product chrome (nav / theme dual)”.

## ECS / PM2 deploy notes

- VM production build uses `build:vm` (`next build --webpack`) so standalone
  does not externalize shiki as unresolvable `shiki-<hash>` packages (Turbopack
  standalone → `MODULE_NOT_FOUND` / 500 on every page).
- Deploy with **explicit** `apps=sailor-docs` only when possible. Preflight
  release pruning must never wipe sibling apps — see
  `docs/ops/ecs-pm2-release-lessons.md`.

## Validation

Run the smallest credible validation after changes:

- `pnpm --filter @nebutra/sailor-docs typecheck`
- `pnpm --filter @nebutra/sailor-docs lint:links`
- `pnpm --filter @nebutra/sailor-docs build`
