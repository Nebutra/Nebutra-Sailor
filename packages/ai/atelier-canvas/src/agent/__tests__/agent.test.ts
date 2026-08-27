/**
 * The /agent subpath closes the loop end-to-end (mock provider): prompt →
 * asset → server placement → durable scene → broadcast hook. Importing this
 * module pulls @nebutra/agents (optional peer); the core export does not.
 */

import { createAgentContext } from "@nebutra/agents";
import { describe, expect, it } from "vitest";
import { InMemoryCanvasStore } from "../../store/memory";
import type { ScenePatch } from "../../types";
import { createAtelierAgent } from "../agent";
import { ATELIER_SYSTEM_PROMPT } from "../prompts";
import { createAtelierGenerationTool } from "../tools";

const ctx = createAgentContext("org_1", "user_1", "conv_1");

describe("atelier system prompt", () => {
  it("encodes the absorbed creative invariants", () => {
    expect(ATELIER_SYSTEM_PROMPT).toContain("Design Strategy");
    expect(ATELIER_SYSTEM_PROMPT).toContain("QUANTITY IS A CONTRACT");
    expect(ATELIER_SYSTEM_PROMPT).toContain("batches of at most 10");
    expect(ATELIER_SYSTEM_PROMPT).toContain("input_images");
  });
});

describe("createAtelierGenerationTool", () => {
  it("generates, places, persists, then fires the broadcast hook", async () => {
    const store = new InMemoryCanvasStore();
    const broadcasts: ScenePatch[] = [];
    const tool = createAtelierGenerationTool({
      store,
      onPlaced: (p) => {
        broadcasts.push(p);
      },
    });

    const out = (await tool.execute(
      { canvasId: "c1", prompt: "a serene alpine lake at dawn" },
      ctx,
    )) as { ok: boolean; placed: { elementId: string; modality: string } };

    expect(out.ok).toBe(true);
    expect(out.placed.modality).toBe("image");

    const canvas = await store.get("org_1", "c1");
    expect(canvas?.scene.elements).toHaveLength(1);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]?.element.id).toBe(out.placed.elementId);
  });

  it("rejects missing required input", async () => {
    const tool = createAtelierGenerationTool({ store: new InMemoryCanvasStore() });
    await expect(tool.execute({ canvasId: "c1" }, ctx)).rejects.toThrow("prompt");
    await expect(tool.execute({ prompt: "x" }, ctx)).rejects.toThrow("canvasId");
  });

  it("places video as an embeddable (no file)", async () => {
    const store = new InMemoryCanvasStore();
    const tool = createAtelierGenerationTool({ store });
    await tool.execute({ canvasId: "c1", prompt: "loop of falling snow", modality: "video" }, ctx);
    const el = (await store.get("org_1", "c1"))?.scene.elements[0];
    expect(el?.type).toBe("embeddable");
  });
});

describe("createAtelierAgent", () => {
  it("produces a single-tool AgentConfig carrying the strategy prompt", () => {
    const agent = createAtelierAgent({ store: new InMemoryCanvasStore() });
    expect(agent.id).toBe("atelier");
    expect(agent.tools).toHaveLength(1);
    expect(agent.tools?.[0]?.name).toBe("atelier_generate");
    expect(agent.instructions).toBe(ATELIER_SYSTEM_PROMPT);
  });
});
