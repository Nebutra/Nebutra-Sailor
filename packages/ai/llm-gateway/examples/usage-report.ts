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
    text: "one",
    usage: { inputTokens: 3, outputTokens: 1, totalTokens: 4 },
  }),
  doctor: async () => ({ provider: "example", ok: true }),
};

const gateway = new LlmGateway({ providers: [provider] });
await gateway.complete({
  capability: "local",
  messages: [{ role: "user", content: "Count to one." }],
});

process.stdout.write(`${JSON.stringify(gateway.usageReport(), null, 2)}\n`);
