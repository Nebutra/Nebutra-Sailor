import { describe, expect, it } from "vitest";
import type { ContextFieldDefinition, LayerId } from "../model";
import { LAYER_IDS } from "../model";
import { getSeedFields } from "../registry";
import { createEmptyContext, InMemoryCompanyContextRepository } from "../repository";

const NOW = "2026-06-05T00:00:00.000Z";
const LATER = "2026-06-05T01:00:00.000Z";

describe("createEmptyContext", () => {
  it("seeds all nine canonical layers", () => {
    const ctx = createEmptyContext("startup_test", "pre_seed", NOW);

    expect(ctx.projectId).toBe("startup_test");
    expect(ctx.stage).toBe("pre_seed");
    expect(ctx.updatedAt).toBe(NOW);
    expect(Object.keys(ctx.layers).sort()).toEqual([...LAYER_IDS].sort());
    expect(Object.keys(ctx.layers)).toHaveLength(9);
  });

  it("seeds each layer's fields from the registry with every value status 'empty'", () => {
    const ctx = createEmptyContext("startup_test", "pre_seed", NOW);

    for (const id of LAYER_IDS) {
      const layer = ctx.layers[id];
      const seedKeys = getSeedFields(id).map((field) => field.key);

      expect(layer.id).toBe(id);
      expect(Object.keys(layer.fields).sort()).toEqual([...seedKeys].sort());

      for (const key of seedKeys) {
        const fieldValue = layer.values[key];
        expect(fieldValue).toBeDefined();
        expect(fieldValue.status).toBe("empty");
        expect(fieldValue.layerId).toBe(id);
        expect(fieldValue.fieldKey).toBe(key);
        expect(fieldValue.updatedAt).toBe(NOW);
      }
    }
  });

  it("stamps the L1 mission seed field as a required line definition", () => {
    const ctx = createEmptyContext("startup_test", "pre_seed", NOW);
    const mission = ctx.layers.L1.fields.mission;

    expect(mission).toMatchObject({ key: "mission", kind: "line", required: true });
    expect(ctx.layers.L1.values.mission.kind).toBe("line");
  });
});

describe("InMemoryCompanyContextRepository", () => {
  function seeded() {
    const repo = new InMemoryCompanyContextRepository();
    const ctx = createEmptyContext("startup_test", "pre_seed", NOW);
    repo.save(ctx);
    return repo;
  }

  it("get returns undefined for an unknown project and the saved context otherwise", () => {
    const repo = new InMemoryCompanyContextRepository();
    expect(repo.get("missing")).toBeUndefined();

    const ctx = createEmptyContext("startup_test", "pre_seed", NOW);
    repo.save(ctx);
    expect(repo.get("startup_test")?.projectId).toBe("startup_test");
  });

  it("getLayer returns a single layer's fields and values", () => {
    const repo = seeded();
    const layer = repo.getLayer("startup_test", "L5");

    expect(layer?.id).toBe("L5");
    expect(layer?.fields.jtbd).toMatchObject({ kind: "structured", required: true });
    expect(layer?.values.jtbd.status).toBe("empty");
  });

  it("upsertField stores the value + provenance and flips status to draft", () => {
    const repo = seeded();
    const updated = repo.upsertField(
      "startup_test",
      "L1",
      "mission",
      "Keep brand, product and revenue coherent.",
      { provenance: "user", confidence: 0.9, now: LATER },
    );
    const stored = updated.layers.L1.values.mission;

    expect(stored.value).toBe("Keep brand, product and revenue coherent.");
    expect(stored.provenance).toBe("user");
    expect(stored.confidence).toBe(0.9);
    expect(stored.status).toBe("draft");
    expect(stored.updatedAt).toBe(LATER);
    // The new context is persisted and the timestamp bumped from the injected now.
    expect(repo.get("startup_test")?.layers.L1.values.mission.value).toBe(
      "Keep brand, product and revenue coherent.",
    );
    expect(repo.get("startup_test")?.updatedAt).toBe(LATER);
  });

  it("upsertField does not mutate the previously stored context (immutability)", () => {
    const repo = seeded();
    const before = repo.get("startup_test");
    repo.upsertField("startup_test", "L1", "mission", "v1", { provenance: "ai", now: LATER });

    // The captured reference must still reflect the original empty value.
    expect(before?.layers.L1.values.mission.status).toBe("empty");
    expect(before?.updatedAt).toBe(NOW);
  });

  it("upsertField throws when provenance is missing", () => {
    const repo = seeded();
    expect(() =>
      // @ts-expect-error — provenance is required; this exercises the runtime guard.
      repo.upsertField("startup_test", "L1", "mission", "v", { now: LATER }),
    ).toThrow(/provenance/i);
  });

  it("upsertField throws for an unknown project", () => {
    const repo = new InMemoryCompanyContextRepository();
    expect(() =>
      repo.upsertField("missing", "L1", "mission", "v", { provenance: "user", now: LATER }),
    ).toThrow(/project/i);
  });

  it("upsertField throws for an unknown field key on the layer", () => {
    const repo = seeded();
    expect(() =>
      repo.upsertField("startup_test", "L1", "nope", "v", { provenance: "user", now: LATER }),
    ).toThrow(/field/i);
  });

  it("rejects an upsert on a locked field unless force is set", () => {
    const repo = seeded();
    repo.upsertField("startup_test", "L1", "mission", "approved", {
      provenance: "user",
      now: LATER,
    });
    repo.lockField("startup_test", "L1", "mission", LATER);

    expect(() =>
      repo.upsertField("startup_test", "L1", "mission", "casual overwrite", {
        provenance: "ai",
        now: LATER,
      }),
    ).toThrow(/locked/i);

    const forced = repo.upsertField("startup_test", "L1", "mission", "deliberate overwrite", {
      provenance: "user",
      now: LATER,
      force: true,
    });
    expect(forced.layers.L1.values.mission.value).toBe("deliberate overwrite");
    // A forced overwrite keeps the field locked (still human-approved).
    expect(forced.layers.L1.values.mission.status).toBe("locked");
  });

  it("lockField then unlockField toggles the protected status", () => {
    const repo = seeded();
    repo.upsertField("startup_test", "L1", "mission", "v", { provenance: "user", now: LATER });

    const locked = repo.lockField("startup_test", "L1", "mission", LATER);
    expect(locked.layers.L1.values.mission.status).toBe("locked");
    expect(locked.updatedAt).toBe(LATER);

    const unlocked = repo.unlockField("startup_test", "L1", "mission", LATER);
    // Unlocking drops back to a non-protected, non-empty status.
    expect(unlocked.layers.L1.values.mission.status).not.toBe("locked");
    expect(unlocked.layers.L1.values.mission.status).not.toBe("empty");
  });

  it("addField adds an extensible field definition + an empty seed value", () => {
    const repo = seeded();
    const def: ContextFieldDefinition = {
      key: "differentiator",
      label: "Differentiator",
      kind: "text",
      required: false,
    };

    const updated = repo.addField("startup_test", "L4", def, LATER);

    expect(updated.layers.L4.fields.differentiator).toEqual(def);
    expect(updated.layers.L4.values.differentiator).toMatchObject({
      layerId: "L4",
      fieldKey: "differentiator",
      kind: "text",
      status: "empty",
    });
    expect(updated.updatedAt).toBe(LATER);
    // The added field is upsertable afterwards.
    const filled = repo.upsertField("startup_test", "L4", "differentiator", "AI-native tower", {
      provenance: "agent",
      now: LATER,
    });
    expect(filled.layers.L4.values.differentiator.status).toBe("draft");
  });

  it("deleteField removes both the definition and the stored value", () => {
    const repo = seeded();
    const updated = repo.deleteField("startup_test", "L1", "why", LATER);

    expect(updated.layers.L1.fields.why).toBeUndefined();
    expect(updated.layers.L1.values.why).toBeUndefined();
    expect(updated.updatedAt).toBe(LATER);
    // Other fields on the layer are untouched.
    expect(updated.layers.L1.fields.mission).toBeDefined();
  });

  it("save replaces the stored context for a project id", () => {
    const repo = seeded();
    const next = { ...createEmptyContext("startup_test", "seed", LATER) };
    repo.save(next);

    expect(repo.get("startup_test")?.stage).toBe("seed");
    expect(repo.get("startup_test")?.updatedAt).toBe(LATER);
  });

  it("upsertField requires a valid layer id", () => {
    const repo = seeded();
    expect(() =>
      repo.upsertField("startup_test", "L99" as LayerId, "mission", "v", {
        provenance: "user",
        now: LATER,
      }),
    ).toThrow();
  });
});
