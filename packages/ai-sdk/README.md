# @nebutra/ai-sdk

> Unified AI SDK wrapper with multi-provider support (OpenRouter, OpenAI, SiliconFlow, Vercel AI Gateway), model presets, embeddings, and agent utilities.

## Installation

```bash
# Internal monorepo dependency
pnpm add @nebutra/ai-sdk@workspace:*
```

## Usage

```typescript
import { configure, generateText, streamText, embed } from "@nebutra/ai-sdk";

// Configure once at app startup
configure({ provider: "openrouter" });

// Generate text
const { text } = await generateText(
  [{ role: "user", content: "Explain monorepos" }],
  { model: "flagship" },
);

// Stream text
const result = await streamText(
  [{ role: "user", content: "Write a haiku" }],
  { model: "fast" },
);
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

// Embeddings
const { embedding } = await embed("Hello world");
```

## API

| Export | Description |
|--------|-------------|
| `configure(config)` | Initialize global AI config (provider, model, temperature) |
| `getConfig()` | Returns current resolved config |
| `generateText(messages, options)` | Generate a complete text response |
| `streamText(messages, options)` | Stream a text response for real-time UI |
| `embed(value, options)` | Generate embedding for a single value |
| `embedMany(values, options)` | Generate embeddings for multiple values |
| `createModel(id, config)` | Create a low-level provider model instance |
| `createEmbeddingModel(id, config)` | Create an embedding model instance |
| `models` | Model preset map (flagship, fast, reasoning, etc.) |
| `resolveModel(alias)` | Resolve a preset alias to a model ID |

### Agent Utilities (`@nebutra/ai-sdk/agents`)

| Export | Description |
|--------|-------------|
| `runAgent(config)` | Execute an agent with tools and memory |
| `registerAgent` / `getAgent` / `listAgents` | Agent registry management |
| `createInMemoryMemory` / `createRedisMemory` | Conversation memory backends |

## Configuration

| Environment Variable | Provider | Description |
|---------------------|----------|-------------|
| `OPENROUTER_API_KEY` | openrouter | OpenRouter API key (default provider) |
| `OPENAI_API_KEY` | openai | Direct OpenAI API key |
| `SILICONFLOW_API_KEY` | siliconflow | SiliconFlow API key |
| `VERCEL_OIDC_TOKEN` | gateway | Vercel AI Gateway OIDC token |

## Model Presets

| Preset | Model |
|--------|-------|
| `flagship` | `anthropic/claude-sonnet-4` |
| `reasoning` | `anthropic/claude-opus-4` |
| `fast` | `anthropic/claude-haiku-4` |
| `embedding` | `openai/text-embedding-3-small` |
| `sf-qwen` | `Qwen/Qwen2.5-72B-Instruct` |
