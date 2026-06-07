import { describe, expect, it } from "vitest";
import { compileTowerFromThesis, type TowerCompileModelInvoker } from "../compile";
import { LAYER_IDS } from "../model";

const NOW = "2026-06-05T00:00:00.000Z";
const THESIS =
  "A Startup Agent OS that turns one founder proposition into a persisted company workspace.";

/** A tower is structurally valid: nine canonical layers, each with values. */
function expectValidTower(tower: Awaited<ReturnType<typeof compileTowerFromThesis>>) {
  expect(Object.keys(tower.layers).sort()).toEqual([...LAYER_IDS].sort());
  expect(Object.keys(tower.layers)).toHaveLength(9);
  for (const id of LAYER_IDS) {
    expect(tower.layers[id].id).toBe(id);
    expect(tower.layers[id].values).toBeDefined();
    expect(tower.layers[id].fields).toBeDefined();
  }
}

describe("compileTowerFromThesis — keyless (no invokeModel)", () => {
  it("seeds an empty nine-layer tower for the project and stage", async () => {
    const tower = await compileTowerFromThesis({
      projectId: "startup_keyless",
      thesis: THESIS,
      stage: "pre_seed",
      now: NOW,
    });

    expect(tower.projectId).toBe("startup_keyless");
    expect(tower.stage).toBe("pre_seed");
    expectValidTower(tower);
  });

  it("defaults the stage to pre_seed when none is supplied", async () => {
    const tower = await compileTowerFromThesis({
      projectId: "startup_default_stage",
      thesis: THESIS,
      now: NOW,
    });

    expect(tower.stage).toBe("pre_seed");
  });

  it("places the thesis verbatim into L1.mission as a user-sourced draft", async () => {
    const tower = await compileTowerFromThesis({
      projectId: "startup_keyless",
      thesis: THESIS,
      now: NOW,
    });
    const mission = tower.layers.L1.values.mission;

    expect(mission.value).toBe(THESIS);
    expect(mission.provenance).toBe("user");
    expect(mission.status).toBe("draft");
    expect(mission.updatedAt).toBe(NOW);
    // Low confidence — this is a verbatim seed, not a reasoned extraction.
    expect(mission.confidence).toBeLessThanOrEqual(0.5);
  });

  it("places the thesis verbatim into L5.value_proposition as a user-sourced draft", async () => {
    const tower = await compileTowerFromThesis({
      projectId: "startup_keyless",
      thesis: THESIS,
      now: NOW,
    });
    const vp = tower.layers.L5.values.value_proposition;

    expect(vp.value).toBe(THESIS);
    expect(vp.provenance).toBe("user");
    expect(vp.status).toBe("draft");
  });

  it("is deterministic — no regex heuristics guessing market or category", async () => {
    const tower = await compileTowerFromThesis({
      projectId: "startup_keyless",
      thesis: THESIS,
      now: NOW,
    });

    // The keyless path NEVER invents L4.category / L4.positioning — they stay empty.
    expect(tower.layers.L4.values.category.status).toBe("empty");
    expect(tower.layers.L4.values.positioning.status).toBe("empty");
    expect(tower.layers.L4.values.category.value).toBeUndefined();
  });

  it("produces identical output for identical input (pure + deterministic)", async () => {
    const a = await compileTowerFromThesis({ projectId: "p", thesis: THESIS, now: NOW });
    const b = await compileTowerFromThesis({ projectId: "p", thesis: THESIS, now: NOW });

    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("compileTowerFromThesis — with injected invokeModel", () => {
  it("upserts each model field entry with provenance 'ai' and confidence", async () => {
    const invokeModel: TowerCompileModelInvoker = async () =>
      JSON.stringify([
        { layerId: "L2", fieldKey: "vision", value: "A coherent company in one prompt." },
        { layerId: "L4", fieldKey: "category", value: "Startup operating system" },
      ]);

    const tower = await compileTowerFromThesis({
      projectId: "startup_ai",
      thesis: THESIS,
      now: NOW,
      invokeModel,
    });

    const vision = tower.layers.L2.values.vision;
    expect(vision.value).toBe("A coherent company in one prompt.");
    expect(vision.provenance).toBe("ai");
    expect(vision.status).toBe("draft");
    expect(typeof vision.confidence).toBe("number");

    const category = tower.layers.L4.values.category;
    expect(category.value).toBe("Startup operating system");
    expect(category.provenance).toBe("ai");
  });

  it("still seeds the verbatim thesis even when a model is provided", async () => {
    const invokeModel: TowerCompileModelInvoker = async () =>
      JSON.stringify([{ layerId: "L2", fieldKey: "vision", value: "X" }]);

    const tower = await compileTowerFromThesis({
      projectId: "startup_ai",
      thesis: THESIS,
      now: NOW,
      invokeModel,
    });

    expect(tower.layers.L1.values.mission.value).toBe(THESIS);
  });

  it("tolerates garbage model output — does not throw and yields a valid tower", async () => {
    const garbage: TowerCompileModelInvoker = async () => "not json at all {{{";

    const tower = await compileTowerFromThesis({
      projectId: "startup_garbage",
      thesis: THESIS,
      now: NOW,
      invokeModel: garbage,
    });

    expectValidTower(tower);
    // The verbatim seed still landed; no AI fields were written from junk.
    expect(tower.layers.L1.values.mission.value).toBe(THESIS);
    expect(tower.layers.L2.values.vision.status).toBe("empty");
  });

  it("skips malformed entries inside an otherwise-valid array without throwing", async () => {
    const partlyBad: TowerCompileModelInvoker = async () =>
      JSON.stringify([
        { layerId: "L2", fieldKey: "vision", value: "good" },
        { layerId: "L99", fieldKey: "ghost", value: "bad-layer" },
        { fieldKey: "missing-layer", value: "bad-shape" },
        { layerId: "L2", fieldKey: "nonexistent_field_zzz", value: "unknown-field" },
      ]);

    const tower = await compileTowerFromThesis({
      projectId: "startup_partly_bad",
      thesis: THESIS,
      now: NOW,
      invokeModel: partlyBad,
    });

    expectValidTower(tower);
    expect(tower.layers.L2.values.vision.value).toBe("good");
    expect(tower.layers.L2.values.vision.provenance).toBe("ai");
  });

  it("does not throw when the model returns a non-array JSON value", async () => {
    const notArray: TowerCompileModelInvoker = async () =>
      JSON.stringify({ layerId: "L2", fieldKey: "vision", value: "single object, not array" });

    const tower = await compileTowerFromThesis({
      projectId: "startup_not_array",
      thesis: THESIS,
      now: NOW,
      invokeModel: notArray,
    });

    expectValidTower(tower);
    expect(tower.layers.L2.values.vision.status).toBe("empty");
  });
});
