/**
 * Public API contract for @nebutra/agents.
 *
 * Guards the surface area that was consolidated from `@nebutra/ai-sdk`
 * (generateText / streamText / embed / embedMany / configure / models / createModel)
 * plus the pre-existing agent orchestration primitives. Any deletion or
 * rename to these exports is a breaking change.
 */

import { describe, expect, it } from "vitest";
import * as agents from "../index";

describe("@nebutra/agents public API contract", () => {
  // ─── Agent orchestration primitives ──────────────────────────────────────
  it("exports BaseAgent class", () => {
    expect(agents.BaseAgent).toBeDefined();
    expect(typeof agents.BaseAgent).toBe("function");
  });

  it("exports AgentOrchestrator class", () => {
    expect(agents.AgentOrchestrator).toBeDefined();
    expect(typeof agents.AgentOrchestrator).toBe("function");
  });

  it("exports AgentRouter class", () => {
    expect(agents.AgentRouter).toBeDefined();
    expect(typeof agents.AgentRouter).toBe("function");
  });

  // ─── Memory functions ────────────────────────────────────────────────────
  it("exports memory functions", () => {
    expect(typeof agents.clearMemory).toBe("function");
    expect(typeof agents.getMemory).toBe("function");
    expect(typeof agents.saveMemory).toBe("function");
  });

  // ─── Tenant / context ────────────────────────────────────────────────────
  it("exports tenant utilities", () => {
    expect(typeof agents.checkAgentQuota).toBe("function");
    expect(typeof agents.createAgentContext).toBe("function");
  });

  // ─── Tools ───────────────────────────────────────────────────────────────
  it("exports built-in tools", () => {
    expect(agents.BUILT_IN_TOOLS).toBeDefined();
    expect(agents.databaseQueryTool).toBeDefined();
    expect(agents.knowledgeBaseTool).toBeDefined();
    expect(agents.webSearchTool).toBeDefined();
  });

  // ─── Vercel AI SDK helpers (absorbed from @nebutra/ai-sdk) ───────────────
  it("exports configure() and getConfig()", () => {
    expect(typeof agents.configure).toBe("function");
    expect(typeof agents.getConfig).toBe("function");
  });

  it("exports generateText() and streamText()", () => {
    expect(typeof agents.generateText).toBe("function");
    expect(typeof agents.streamText).toBe("function");
  });

  it("exports embed() and embedMany()", () => {
    expect(typeof agents.embed).toBe("function");
    expect(typeof agents.embedMany).toBe("function");
  });

  it("exports createModel() and createEmbeddingModel()", () => {
    expect(typeof agents.createModel).toBe("function");
    expect(typeof agents.createEmbeddingModel).toBe("function");
  });

  it("exports models preset map with expected keys", () => {
    expect(agents.models).toBeDefined();
    expect(agents.models.flagship).toBeTypeOf("string");
    expect(agents.models.fast).toBeTypeOf("string");
    expect(agents.models.embedding).toBeTypeOf("string");
  });

  it("exports resolveModel() and returns presets correctly", () => {
    expect(typeof agents.resolveModel).toBe("function");
    expect(agents.resolveModel("flagship")).toBe(agents.models.flagship);
    expect(agents.resolveModel("custom/passthrough")).toBe("custom/passthrough");
  });

  it("configure() accepts a provider selection and getConfig() reflects it", () => {
    agents.configure({ provider: "openai", defaultModel: "gpt-4o" });
    const cfg = agents.getConfig();
    expect(cfg.provider).toBe("openai");
    expect(cfg.defaultModel).toBe("gpt-4o");
  });

  it("NebutraAIConfigSchema validates input config", () => {
    expect(agents.NebutraAIConfigSchema).toBeDefined();
    const parsed = agents.NebutraAIConfigSchema.parse({});
    expect(parsed.provider).toBe("openrouter"); // default
    expect(parsed.defaultModel).toBeTypeOf("string");
  });

  it("AgentOrchestrator can be instantiated with empty agents", () => {
    const orch = new agents.AgentOrchestrator({ agents: [] });
    expect(orch).toBeInstanceOf(agents.AgentOrchestrator);
  });

  it("BaseAgent can be instantiated with an AgentConfig", () => {
    const agent = new agents.BaseAgent({
      id: "test",
      name: "Test Agent",
      description: "Contract test",
      model: "openai/gpt-4",
      instructions: "You are a test agent.",
    });
    expect(agent.config.id).toBe("test");
  });
});
