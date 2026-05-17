import type { LLMProvider } from "@nebutra/provider-registry";
import { LlmGateway } from "../src/index";

const provider: LLMProvider = {
  id: "example",
  model: "example",
  capabilities: new Set(["local"]),
  complete: async () => ({
    id: "example",
    provider: "example",
    model: "example",
    text: "cached response",
    usage: { inputTokens: 2, outputTokens: 2, totalTokens: 4 },
  }),
  doctor: async () => ({ provider: "example", ok: true }),
};

const gateway = new LlmGateway({ providers: [provider] });
const request = {
  capability: "local",
  messages: [
    { role: "system", content: "Answer tersely." },
    { role: "user", content: "Say hello." },
  ],
} as const;

await gateway.complete(request);
await gateway.complete(request);

process.stdout.write(`${JSON.stringify(gateway.cacheStats(), null, 2)}\n`);
