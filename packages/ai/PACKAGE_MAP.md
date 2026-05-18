# packages/ai Package Map

`packages/ai` is governed by package surface, not by implementation fashion or
upstream project names. The `nebutra.surface` field in each `package.json` is
the machine-readable source of truth; this file is the human map.

## Surface Families

| Surface | Packages | Rule |
| --- | --- | --- |
| `model-runtime` | `@nebutra/agents` | Owns model execution helpers and provider SDK integration. Other packages inject it or call it through explicit adapters. |
| `provider-metadata` | `@nebutra/ai-providers` | Metadata only. No runtime SDK calls. |
| `agent-runtime` | `@nebutra/agent-runtime` | Owns Thread/Turn/Item, policy, approval, pause/resume, rollout, and runtime grammar. No concrete execution or generation package imports. |
| `tool-protocol` | `@nebutra/mcp` | Owns MCP host/client/server protocol seams. |
| `tool-registry` | `@nebutra/tool-registry` | Owns SKILL.md discovery, validation, and progressive loading. |
| `execution-router` | `@nebutra/sandbox-runtime` | Owns sandbox provider routing and execution isolation. |
| `execution-capability` | `@nebutra/browser-control`, `@nebutra/code-execution`, `@nebutra/document-pipeline` | Tool-shaped execution abilities. No runtime state or model ownership. |
| `generation-capability` | `@nebutra/image-pipeline`, `@nebutra/video-pipeline`, `@nebutra/audio-pipeline`, `@nebutra/voice-realtime`, `@nebutra/3d-pipeline` | BrandContext-first media abilities. No runtime state or model ownership. |
| `support-contract` | `@nebutra/generation-context` | Shared typed contracts used by capability packages. Must stay dependency-light. |
| `persistence` | `@nebutra/content-store`, `@nebutra/event-log` | File truth, indexing, immutable event history, rollback, and branch state. |
| `semantic-index` | `@nebutra/code-index`, `@nebutra/knowledge-rag` | Retrieval/indexing grammar over injected embedding/vector/search ports. |
| `media-graph` | `@nebutra/reel` | Typed media graph, storyboard shot/scene/plan primitives, IO envelope, and graph persistence. |
| `creative-surface` | `@nebutra/atelier-canvas` | Canvas/scene editing surface over lower graph/storage primitives. |
| `product-orchestration` | `@nebutra/cinema`, `@nebutra/play-loader` | Declarative product workflows over lower runtime/tool/media surfaces. |
| `gateway-experiment` | `@nebutra/llm-gateway` | Local experiment only; production gateway is outside `packages/ai`. |
| `legacy-experiment` | `@nebutra/provider-registry` | Local provider trait experiment only. New production consumers are forbidden. |

## Consolidation Rules

1. Do not merge packages across surfaces. A runtime package and a capability
   package have different owners even when their code is small.
2. Merge or demote packages when two packages in the same surface own the same
   fact or public concept. One owner wins; the loser becomes a subpath export or
   is deleted.
3. Shared facts become `support-contract` packages only when at least two
   capability families need them. `@nebutra/generation-context` is the current
   example: it owns `BrandContext` so media packages do not drift.
4. Capability packages expose deterministic APIs, doctors, debug logs, examples,
   and adapter ports. They do not own prompts, agents, provider routing,
   tenant billing, approval lifecycle, or runtime state.
5. Cross-capability DX primitives live in the platform package
   `@nebutra/capability-kit`: capability errors, doctor/debug CLI dispatch, and
   `.nebutra/debug/<capability>.jsonl` storage. AI capability packages depend on
   it instead of each owning a copy.
6. Media storyboards are owned by `@nebutra/reel/storyboard`. Generation
   packages such as `@nebutra/video-pipeline` consume those types instead of
   maintaining parallel scene/plan contracts.
7. Legacy experiments may remain only while marked WIP and blocked from new
   production consumers by architecture tests.
