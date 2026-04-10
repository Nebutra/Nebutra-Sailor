# @nebutra/langchain

> LangChain integration layer providing RAG retrieval, chat memory, and chain utilities with tenant isolation.

## Installation

```bash
# Internal monorepo dependency
pnpm add @nebutra/langchain@workspace:*
```

## Usage

### RAG Retrieval

```typescript
import { createRAGRetriever } from "@nebutra/langchain/rag";

const retriever = createRAGRetriever({
  vectorStore: {
    provider: "supabase",
    collection: "documents",
    tenantId: "org_123",
  },
  topK: 5,
  similarityThreshold: 0.7,
});

const chunks = await retriever.retrieve("How do I deploy?");
```

### Chat Memory

```typescript
import { createChatMemory } from "@nebutra/langchain/memory";

const memory = createChatMemory({
  conversationId: "conv_abc",
  tenantId: "org_123",
  backend: "redis",
  maxMessages: 50,
});
```

### Sequential Chains

```typescript
import { runSequentialChain, createSummarizeStep } from "@nebutra/langchain/chains";

const result = await runSequentialChain(
  [createSummarizeStep()],
  { text: "Long document content..." },
  { tenantId: "org_123" },
);
```

## API

### `@nebutra/langchain/rag`

| Export | Description |
|--------|-------------|
| `createRAGRetriever(config)` | Create a tenant-isolated RAG retriever |
| `DocumentChunk` | Type for retrieved document chunks |
| `RAGConfig` | Configuration for vector store, topK, threshold |
| `VectorStoreConfig` | Vector store provider config (supabase, pinecone, qdrant, in-memory) |

### `@nebutra/langchain/memory`

| Export | Description |
|--------|-------------|
| `createChatMemory(config)` | Create a chat memory instance (Redis or in-memory) |
| `ChatMessage` | Message type (human, ai, system, tool) |
| `ChatMemoryConfig` | Memory configuration (conversationId, tenantId, backend) |

### `@nebutra/langchain/chains`

| Export | Description |
|--------|-------------|
| `runSequentialChain(steps, input, context)` | Execute a chain of steps sequentially |
| `createSummarizeStep(model?)` | Create a text summarization chain step |
| `ChainStep` | Interface for chain step definitions |

## Peer Dependencies

- `langchain` ^0.3.0
- `@langchain/core` ^0.3.0
