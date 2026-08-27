import { describe, expect, it } from "vitest";
import type { DocumentModelInvoker } from "../document";
import { fillTowerFromDocument } from "../document";
import { createEmptyContext, InMemoryCompanyContextRepository } from "../repository";

const NOW = "2026-06-05T00:00:00.000Z";

function seededRepo() {
  const repo = new InMemoryCompanyContextRepository();
  repo.save(createEmptyContext("startup_doc", "pre_seed", NOW));
  return repo;
}

describe("fillTowerFromDocument", () => {
  it("keyless default extracts nothing and never throws", async () => {
    const repo = seededRepo();

    const result = await fillTowerFromDocument({
      projectId: "startup_doc",
      text: "We are an AI debugging company. Our mission is to keep production calm.",
      repository: repo,
      now: () => NOW,
    });

    expect(result.applied).toEqual([]);
    // The stored context is untouched — mission stays empty.
    expect(repo.get("startup_doc")?.layers.L1.values.mission.status).toBe("empty");
  });

  it("upserts an injected model's extracted field with provenance 'document'", async () => {
    const repo = seededRepo();
    const invokeModel: DocumentModelInvoker = async () =>
      JSON.stringify([
        { layerId: "L1", fieldKey: "mission", value: "Keep production calm for AI-era teams." },
      ]);

    const result = await fillTowerFromDocument({
      projectId: "startup_doc",
      text: "Our mission is to keep production calm for AI-era teams.",
      invokeModel,
      repository: repo,
      now: () => NOW,
    });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]).toMatchObject({
      layerId: "L1",
      fieldKey: "mission",
      value: "Keep production calm for AI-era teams.",
      provenance: "document",
      status: "draft",
    });

    const stored = repo.get("startup_doc")?.layers.L1.values.mission;
    expect(stored?.value).toBe("Keep production calm for AI-era teams.");
    expect(stored?.provenance).toBe("document");
  });

  it("tolerates junk model output without throwing and applies nothing", async () => {
    const repo = seededRepo();
    const invokeModel: DocumentModelInvoker = async () => "not json at all {{{";

    const result = await fillTowerFromDocument({
      projectId: "startup_doc",
      text: "Some founder doc text.",
      invokeModel,
      repository: repo,
      now: () => NOW,
    });

    expect(result.applied).toEqual([]);
  });

  it("skips malformed entries but applies the valid ones (tolerant bulk upsert)", async () => {
    const repo = seededRepo();
    const invokeModel: DocumentModelInvoker = async () =>
      JSON.stringify([
        { layerId: "L1", fieldKey: "mission", value: "Valid mission." },
        { layerId: "ZZ", fieldKey: "ghost", value: "bad layer id" },
        { fieldKey: "no_layer", value: "missing layerId" },
        { layerId: "L1", fieldKey: "not_a_real_field", value: "unknown field key" },
      ]);

    const result = await fillTowerFromDocument({
      projectId: "startup_doc",
      text: "doc",
      invokeModel,
      repository: repo,
      now: () => NOW,
    });

    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]).toMatchObject({ layerId: "L1", fieldKey: "mission" });
  });
});
