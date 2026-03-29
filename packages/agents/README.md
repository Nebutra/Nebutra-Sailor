# @nebutra/agents — Multi-Agent Orchestration Engine

> **Status: Production-ready core** — BaseAgent, Orchestrator, Memory, and VercelAI provider are functional. LangChain provider is a stub.

## Architecture

```
@nebutra/agents              ← Provider-agnostic framework (USE THIS)
  ├── BaseAgent              ← Abstract base with tenant context + usage tracking
  ├── AgentOrchestrator      ← Multi-agent coordination (chat/pipeline/broadcast)
  ├── AgentRouter            ← Route messages to the right agent
  ├── Memory                 ← Redis-backed per-tenant conversation persistence
  ├── Tools                  ← Built-in tool registry (web_search, db_query, knowledge_base)
  └── providers/
      ├── vercel-ai.ts       ← Vercel AI SDK v6 adapter (ToolLoopAgent)
      └── langchain.ts       ← LangChain.js adapter (stub — install langchain to activate)

@nebutra/ai-sdk/agents       ← Vercel-specific convenience utilities
  ├── runAgent()             ← Shorthand for single-shot agent execution
  ├── ConversationMemory     ← Memory interface (Redis + in-memory)
  └── Registry               ← Simple agent registry

@nebutra/langchain           ← LangChain.js bridge (optional, peerDep)
  ├── RAG retriever          ← Tenant-isolated vector store interface
  ├── Chat memory            ← LangChain-compatible memory backend
  └── Chain runner           ← Sequential chain execution
```

## Which package should I use?

| Scenario | Package |
|----------|---------|
| **Building a multi-agent SaaS** | `@nebutra/agents` (this package) |
| **Simple single-agent chat** | `@nebutra/ai-sdk/agents` (convenience) or AI SDK directly |
| **RAG / document retrieval** | `@nebutra/langchain` |
| **Not using Vercel AI SDK** | `@nebutra/agents` + implement your own provider adapter |

## Multi-tenant by design

Every agent operation requires a `tenantId`. Usage events are emitted for billing integration.

```ts
import { VercelAIAgent } from "@nebutra/agents";

const agent = new VercelAIAgent({
  id: "assistant",
  name: "My Assistant",
  model: "openai/gpt-5.4",
  instructions: "You are helpful.",
});

const response = await agent.run(messages, {
  tenantId: "org_123",
  userId: "user_456",
  conversationId: "conv_789",
});
// → response.usage tracks tokens for billing
```
