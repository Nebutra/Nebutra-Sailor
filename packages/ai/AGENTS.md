# AGENTS.md — packages/ai

Parent execution contract for Nebutra AI packages. Package-local `AGENTS.md`
files may add stricter rules; this file owns the cross-package boundaries.

## Layering

`packages/ai` is split by responsibility, not by upstream project names:

| Role | Canonical package | Boundary |
| --- | --- | --- |
| Model execution runtime | `@nebutra/agents` | The canonical model-execution runtime. It owns Vercel AI SDK integration, provider selection, fallback, embeddings, generation helpers, and observability hooks. |
| Provider metadata | `@nebutra/ai-providers` | Metadata only. It owns provider IDs, categories, status flags, env-var requirements, and scaffolding templates. Do not add runtime SDK calls here. |
| Public API gateway | `backends/gateway` + `@nebutra/gateway-core` | External `sk-sailor-*` auth, tenant usage metering, upstream pool routing, and response accounting. |
| Agent protocol/runtime grammar | `@nebutra/agent-runtime` | Thread/turn/item model, policy, tool/MCP bridge, rollout, sandbox seam. It must not own provider SDK execution. |
| Tool integration | `@nebutra/mcp`, `@nebutra/tool-registry`, `@nebutra/sandbox-runtime` | MCP/tool discovery, SKILL.md parsing/loading, consent, audit, and sandbox routing boundaries. |
| Execution capability tools | `@nebutra/browser-control`, `@nebutra/code-execution`, `@nebutra/document-pipeline` | Deterministic or semi-deterministic tool execution. They must not own Thread/Turn/Item state, prompt generation, model/provider execution, sub-agent scheduling, or approval lifecycle. |
| Generation capability tools | `@nebutra/image-pipeline`, `@nebutra/video-pipeline`, `@nebutra/audio-pipeline`, `@nebutra/voice-realtime`, `@nebutra/3d-pipeline` | BrandContext-first media generation surfaces. They may expose local deterministic fallbacks and sidecar adapter ports, but must not own Thread/Turn/Item state, prompt orchestration, model/provider routing, or approval lifecycle. |
| Shared support contracts | `@nebutra/generation-context`, `@nebutra/execution-policy`, `@nebutra/local-embedding` | Single TypeScript owners for facts consumed across surfaces: `BrandContext`, command permission/approval primitives, and deterministic local embeddings. |
| Persistence contracts | `@nebutra/content-store` | File truth, frontmatter parsing/serialization, paragraph chunk helpers, and rebuildable indexes. Parser packages consume these helpers rather than defining file-truth grammar. |
| Capability DX primitives | `@nebutra/capability-kit` | Platform package outside `packages/ai` that owns suggestion-bearing capability errors, doctor/debug CLI switching, and `.nebutra/debug/<capability>.jsonl` helpers. Capability packages must import these primitives instead of re-implementing them. |
| RAG/indexing/dataflow | `@nebutra/knowledge-rag`, `@nebutra/code-index`, `@nebutra/reel`, `@nebutra/atelier-canvas`, `@nebutra/cinema` | Product capabilities built on injected model/vector/store/tool ports. |
| Legacy local experiments | `@nebutra/llm-gateway`, `@nebutra/provider-registry` | `@nebutra/llm-gateway` is not the production gateway; `@nebutra/provider-registry` is a local-provider experiment. Do not add new production consumers. |

The complete surface registry lives in `packages/ai/PACKAGE_MAP.md`. Every
`@nebutra/*` package under `packages/ai` must declare `nebutra.featureId` and
`nebutra.surface` in `package.json`.

## Consolidation Rules

1. Do not merge packages across surfaces. A runtime grammar package and a
   deterministic tool package have different owners even when both are small.
2. If two packages in the same surface own the same fact or public concept,
   choose one owner and move the other behind a subpath export or delete it.
3. Shared facts used by multiple capability families must live in a
   `support-contract` package. Do not duplicate those types in each capability.
4. Capability packages expose adapters and deterministic APIs; they do not own
   prompts, provider routing, tenant billing, approval lifecycle, or runtime
   state.
5. Capability debug storage, CLI command dispatch, and suggestion-bearing base
   errors belong to `@nebutra/capability-kit`; do not hand-roll debug JSONL
   helpers inside individual capability packages.
6. Media graph facts belong to `@nebutra/reel` subpaths. Video/image/audio
   pipelines may render or adapt media, but shared storyboard shot/scene/plan
   types must come from `@nebutra/reel/storyboard`.
7. Command permission and shell approval defaults belong to
   `@nebutra/execution-policy`. Runtime packages may decide when to ask a
   human; execution packages only evaluate that shared contract.
8. File-truth frontmatter parsing, frontmatter serialization, and paragraph
   chunk helpers belong to `@nebutra/content-store`. Document ingestion
   packages may parse external formats, but must not define a parallel
   frontmatter grammar.
9. Deterministic zero-config embeddings belong to `@nebutra/local-embedding`.
   Persistence and RAG packages may choose different dimensions, but must not
   define parallel local hashing/tokenization algorithms.
10. SKILL.md frontmatter parsing belongs to `@nebutra/tool-registry`.
   `@nebutra/play-loader` extends the parsed document into Play metadata; it
   must not parse YAML/frontmatter independently. `@nebutra/agent-runtime`
   definitions are a separate runtime grammar with source tiers, invocation
   gates, and tenant merge semantics, so do not merge them into SKILL.md without
   an RFC.
11. Runtime tool dispatch belongs to `@nebutra/agent-runtime` as
   `RuntimeToolRegistry`. Do not confuse it with the SKILL.md package registry
   in `@nebutra/tool-registry`.
12. Legacy experiments stay WIP and blocked from new production consumers until
   they are either retired or promoted through a separate RFC.

## 2026 AI SaaS Defaults

1. Use production-proven provider surfaces first: Vercel AI SDK for app/runtime
   model calls, provider SDKs for direct integrations, and managed/self-hosted
   gateway layers such as Vercel AI Gateway, LiteLLM, Portkey, OpenRouter, or a
   Nebutra gateway adapter for tenant metering.
2. Keep key material out of checked-in configuration. Package APIs should accept
   injected clients, env-var names, or vault-backed resolvers rather than raw
   secrets.
3. Runtime packages must emit tenant/user/request/provider metadata where the
   boundary allows it. Usage accounting and audit events belong at gateway or
   runtime adapter seams, not scattered through product packages.
4. RAG, code indexing, canvas, media, and tool packages should depend on ports
   and injected adapters. They may call `@nebutra/agents` helpers only through
   explicit provider adapters.
5. New packages must declare whether they are runtime, metadata, tool,
   persistence, product-capability, or legacy/compatibility surfaces before
   exposing public exports.

## Import Rules

- New model execution code imports from `@nebutra/agents`, not
  `@nebutra/llm-gateway` or `@nebutra/provider-registry`.
- `@nebutra/ai-providers` must remain metadata only and dependency-light.
- `@nebutra/agent-runtime` may bridge to MCP/tool/sandbox contracts, but model
  calls stay injected or delegated to `@nebutra/agents`.
- Execution capability packages must not import `@nebutra/agent-runtime`,
  `@nebutra/agents`, `ai`, `@nebutra/llm-gateway`, or
  `@nebutra/provider-registry` from production source. They expose tool-shaped
  ports; the runtime decides when to call them.
- `@nebutra/agent-runtime` must not hard-import concrete execution capability
  packages. Composition happens through tool registry/adapters so execution
  capabilities remain replaceable.
- Generation capability packages must import `BrandContext` from
  `@nebutra/generation-context`; do not define parallel brand schemas inside
  individual media packages.
- Execution and generation capability packages must import debug JSONL helpers
  from `@nebutra/capability-kit/debug`; do not define local `debugPath`,
  `appendDebug`, or `readFile(debugPath(...))` variants.
- Generation capability packages must not import `@nebutra/agent-runtime`,
  `@nebutra/agents`, `ai`, `@nebutra/llm-gateway`, or
  `@nebutra/provider-registry` from production source.
- `@nebutra/video-pipeline` must consume storyboard plan primitives from
  `@nebutra/reel/storyboard`; it should not define a parallel Storyboard model.
- `@nebutra/code-execution` must consume command approval rules from
  `@nebutra/execution-policy`; it should not define a parallel default safety
  policy.
- `@nebutra/document-pipeline` must consume frontmatter and paragraph helpers
  from `@nebutra/content-store`; file-truth schema parsing belongs to
  persistence, not parser adapters.
- `@nebutra/content-store` and `@nebutra/knowledge-rag` must consume
  deterministic local embedding helpers from `@nebutra/local-embedding`; do not
  duplicate FNV/hash embedding logic inside either package.
- `@nebutra/play-loader` must consume parsed SKILL.md documents from
  `@nebutra/tool-registry`; do not import YAML parsers or call
  `parseSkillFrontmatter(markdown)` after `parseSkillMarkdown(markdown)`.
- New runtime code should use `RuntimeToolRegistry` for in-memory tool
  dispatch. `ToolRegistry` remains a compatibility alias in
  `@nebutra/agent-runtime`, while `@nebutra/tool-registry` remains the package
  name for SKILL.md registry semantics.
- Product capability packages should not own billing deduction, gateway auth, or
  provider-key selection.
- Examples may import legacy packages to demonstrate migration, but production
  source must not create new runtime dependencies on them.

## Validation

Run the cross-package boundary test after changing package exports, dependency
edges, provider routing, or package status metadata:

```bash
pnpm exec vitest run tests/architecture/ai-package-governance.test.ts
```

Run the touched package's own tests/typecheck next. Do not update generated
`dist/` output by hand.
