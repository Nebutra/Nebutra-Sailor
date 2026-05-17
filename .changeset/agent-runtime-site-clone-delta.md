---
"@nebutra/agent-runtime": minor
---

Absorb the site-clone / targeted-edit delta (over the already-absorbed core).

- `design-context`: website → structured generation seed
  `{content, brand{colors,fonts}, screenshot, title}` — pure normalizer +
  injected `ScrapeProvider` port (no network/provider lock-in),
  `toGenerationSeed` bounded deterministic prompt block.
- `edit-planner`: pattern-driven `analyzeEditIntent` (7 EditTypes) +
  `selectFilesForEdit` (primary/context split + deterministic system-prompt
  builder) + generalised fast-apply (`parseEditBlocks` / `applyEditBlock`
  with an injected merger). Targeted edit planning vs regenerate-all.

Tenant-scoped & fail-closed; pure data/logic; scrape + LLM-merge are
injected ports. 219 package tests.
