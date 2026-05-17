import type { LLMProvider } from "@nebutra/provider-registry";
import { LlmGateway } from "../src/index";

const failing: LLMProvider = {
  id: "unhealthy",
  model: "unhealthy",
  capabilities: new Set(["local"]),
  complete: async () => {
    throw new Error("provider unavailable");
  },
  doctor: async () => ({ provider: "unhealthy", ok: false, suggestion: "Use fallback provider." }),
};

const healthy: LLMProvider = {
  id: "healthy",
  model: "healthy",
  capabilities: new Set(["local"]),
  complete: async () => ({ id: "ok", provider: "healthy", model: "healthy", text: "fallback ok" }),
  doctor: async () => ({ provider: "healthy", ok: true }),
};

const gateway = new LlmGateway({ providers: [failing, healthy] });
const response = await gateway.complete({
  capability: "local",
  messages: [{ role: "user", content: "Return a two-word status." }],
});

process.stdout.write(`${response.text}\n`);
