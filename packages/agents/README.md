# @nebutra/agents — Nebutra AI Runtime

> **Status: Production-ready** — The single AI runtime package for Nebutra.
> As of v1.0.0 it consolidates the former `@nebutra/ai-sdk` (top-level
> `generateText` / `streamText` / `embed` helpers) with the multi-agent
> orchestration framework (`BaseAgent`, `AgentOrchestrator`, memory, tools).

## What lives here

```
@nebutra/agents
  ├── Top-level Vercel AI SDK helpers (absorbed from @nebutra/ai-sdk)
  │     configure(), generateText(), streamText(), embed(), embedMany()
  │     createModel(), createEmbeddingModel(), models, resolveModel()
  │
  ├── Multi-agent framework
  │     BaseAgent              ← Abstract agent with tenant context + usage tracking
  │     AgentOrchestrator      ← chat/pipeline/broadcast coordination
  │     AgentRouter            ← route messages to the best agent
  │     Memory                 ← Redis-backed per-tenant conversation persistence
  │     Tools                  ← BUILT_IN_TOOLS (web_search, db_query, knowledge_base)
  │
  └── Provider adapters
        providers/vercel-ai.ts ← VercelAIAgent (production, streamText + toolLoop)
        providers/langchain.ts ← Optional LangChain stub (throws until you wire it up)
```

## Companion package

| Package | Role |
|---------|------|
| `@nebutra/agents` | Runtime — all AI calls go through here |
| `@nebutra/ai-providers` | Meta-only — provider registry data + scaffolding templates consumed by `@nebutra/create-sailor` |

The former `@nebutra/ai-sdk` was absorbed into this package in v1.0.0.
The former `@nebutra/langchain` stub was deleted (no callers); the LangChain
integration hook lives here in `providers/langchain.ts` as an extension point.

## Quick start — single-shot generation

```ts
import { configure, streamText } from "@nebutra/agents";

configure({ provider: "openrouter", defaultModel: "anthropic/claude-sonnet-4" });

const result = await streamText(
  [{ role: "user", content: "Explain monorepos" }],
  { model: "fast" },
);
return result.toUIMessageStreamResponse();
```

## Quick start — multi-agent orchestration

```ts
import { AgentOrchestrator, createAgentContext } from "@nebutra/agents";
import { VercelAIAgent } from "@nebutra/agents/providers/vercel-ai";

const orchestrator = new AgentOrchestrator({
  agents: [
    { id: "assistant", name: "Assistant", description: "Helpful", model: "openai/gpt-4", instructions: "..." },
  ],
});

// Swap the BaseAgent for a real VercelAIAgent at runtime:
orchestrator.registerAgent(
  new VercelAIAgent({ id: "assistant", name: "Assistant", description: "Helpful", model: "openai/gpt-4", instructions: "..." }),
);

const ctx = createAgentContext("org_123", "user_456");
const response = await orchestrator.chat("Hello", ctx);
// → response.usage tracks tokens for billing
```

## Multi-tenant by design

Every agent operation requires a `tenantId`. Usage events are emitted for
billing and metering integration (see `@nebutra/billing/credits`).
