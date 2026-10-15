# AGENTS.md — apps/kcq-docs

KCQ's documentation at kcq.nebutra.com/docs (English) and /zh/docs (Chinese): a Fumadocs static
export, served by the KCQ nginx next to the product (infra/fly/kcq.nginx.conf) and shipped by the
same deploy (.github/workflows/deploy-kcq-fly.yml).

## Source of truth

- The chart facts come from the pinned chart checkout (apps/kcq/chart-source.json, resolved by
  apps/kcq/scripts/chart-source.mjs). `scripts/generate.mjs` reads it and writes every generated
  file listed in `.generated/manifest.json` (all gitignored): agent tool reference (from the
  `@Tool` registry, by running it), component reference (from KLineChart.vue and the React
  wrapper), live-bars SSE contract, HTTP API (OpenAPI), changelog (docs/release), imported source
  documents (ADRs, design notes, engineering notes, contributing), tokens, fonts, wordmark, facts.
- Hand-written pages: `content/docs/{en,zh}/**/*.mdx`. Same path in both languages. A page that
  only exists in one language is shown in the other with a note; never machine-translate.
- English descriptions for component props/events/slots: `scripts/data/component-descriptions.json`.

## Rules

- Never state an API, default or number that the pinned source does not contain. If a README and
  the code disagree, the code wins.
- Design: KCQ tokens (`--klc-*`) only, one accent (Cobalt), hairlines, three radii, no eyebrows.
  Headings DM Sans 500, body Geist, code Geist Mono; the wordmark is an Outfit outline.
- The site CSP admits no inline script except the public pages' theme script (by hash), so
  `scripts/postbuild.mjs` moves Next's inline payload into deferred files. Do not add inline scripts.
- Only `/docs` and `/zh/docs` paths go through Next's router; links to product pages are plain.

## Validation

- `pnpm --filter @nebutra/kcq-docs typecheck`
- `pnpm --filter @nebutra/kcq-docs test`
- `pnpm --filter @nebutra/kcq-docs build` (generate → fumadocs-mdx → next build → postbuild; output `dist/`)
- `python3 -m unittest discover -s infra/fly -p 'test_kcq_*.py'`
