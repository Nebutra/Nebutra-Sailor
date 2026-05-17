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
| Tool integration | `@nebutra/mcp`, `@nebutra/tool-registry`, `@nebutra/sandbox-runtime` | MCP/tool discovery, consent, audit, and sandbox routing boundaries. |
| RAG/indexing/dataflow | `@nebutra/knowledge-rag`, `@nebutra/code-index`, `@nebutra/reel`, `@nebutra/atelier-canvas`, `@nebutra/cinema` | Product capabilities built on injected model/vector/store/tool ports. |
| Legacy local experiments | `@nebutra/llm-gateway`, `@nebutra/provider-registry` | `@nebutra/llm-gateway` is not the production gateway; `@nebutra/provider-registry` is a local-provider experiment. Do not add new production consumers. |

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
