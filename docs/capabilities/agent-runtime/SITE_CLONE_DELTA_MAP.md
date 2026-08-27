# agent-runtime — site-clone/targeted-edit delta map (P2)

> Source: an open-source "chat-to-build React app + clone a website" builder
> (conversation-only). Frame (governance-confirmed): **extend
> `@nebutra/agent-runtime`, translate ONLY the delta** — codegen/sandbox/
> harness core is already absorbed.

## Map

| # | Capability | Verdict | Module |
|---|---|---|---|
| — | loop, policy, tool/MCP, rollout, dispatcher, sandbox seam, skills, hooks, commands, subagents, artifact-stream, workbench, provider routing | **SKIP** | already absorbed; reused |
| — | E2B sandbox / Vite preview / build-validator ops glue | **SKIP / out-of-scope** | maps to `ExternalSandbox` seam; ops monitoring not a core capability |
| 1 | **Design-context ingestion** — turn an existing site URL into a structured generation seed `{content, brand{colors,fonts}, screenshot, title}`; pure normalizer + injected `ScrapeProvider` port (provider-specific scrape NOT ported); `toGenerationSeed` renders a bounded deterministic prompt block. | **PORT** | `design-context.ts` |
| 2 | **Edit planner** — pattern-driven `analyzeEditIntent(prompt, FileManifest) → EditIntent` (7 EditTypes), `selectFilesForEdit → FileContext` (primary/context split + deterministic system-prompt builder), and a generalised fast-apply (`parseEditBlocks` + `applyEditBlock` with an injected merger). Targeted edit planning vs regenerate-all / raw tool loop. | **PORT** | `edit-planner.ts` |

## Honest scope

- **Done (built + tested):** both modules. Package total **219 tests green,
  typecheck clean**. Tenant-scoped & fail-closed; pure data/logic; the scrape
  and the LLM-merge are injected ports (no network, no provider lock-in).
- **Deliberately not ported (not faked):** the provider-specific scrape
  client; the LLM code-merge call (injected); E2B/Vite/preview ops; the
  builder UI. Provider-branded actions generalised to neutral vocabulary.
- **Not in scope (already absorbed):** codegen streaming (artifact-stream),
  project file state (workbench), sandbox delegation (ExternalSandbox seam),
  provider routing (@nebutra/agents) — reused via the existing package.
