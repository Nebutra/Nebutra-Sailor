import { describe, expect, it } from "vitest";
import type { LayerId, Stability } from "../model";
import { getLayerMeta, getSeedFields, LAYER_REGISTRY, SEED_FIELDS } from "../registry";

describe("LAYER_REGISTRY", () => {
  it("has exactly nine layers in canonical bottom -> top order", () => {
    expect(LAYER_REGISTRY).toHaveLength(9);
    expect(LAYER_REGISTRY.map((layer) => layer.id)).toEqual([
      "L1",
      "L2",
      "L3",
      "L4",
      "L5",
      "L6",
      "L7",
      "L8",
      "L9",
    ]);
    expect(LAYER_REGISTRY.map((layer) => layer.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("carries the canonical layer keys", () => {
    expect(LAYER_REGISTRY.map((layer) => layer.key)).toEqual([
      "essence",
      "future",
      "principles",
      "strategy",
      "product",
      "users",
      "narrative",
      "identity",
      "execution",
    ]);
  });

  it("carries the canonical stabilities per layer", () => {
    const stabilityById: Record<LayerId, Stability> = {
      L1: "century",
      L2: "decades",
      L3: "years",
      L4: "years_1_3",
      L5: "quarter",
      L6: "half_year",
      L7: "years_1_2",
      L8: "years_5_plus",
      L9: "weekly",
    };

    for (const layer of LAYER_REGISTRY) {
      expect(layer.stability).toBe(stabilityById[layer.id]);
    }
  });

  it("carries the canonical zh label and question per layer", () => {
    const meta = getLayerMeta("L8");
    expect(meta.zh).toBe("身份");
    expect(meta.q).toBe("是谁的化身");

    const l9 = getLayerMeta("L9");
    expect(l9.zh).toBe("执行");
    expect(l9.q).toBe("接下来干什么");
  });
});

describe("getLayerMeta", () => {
  it("returns the registry entry for a layer id", () => {
    const l1 = getLayerMeta("L1");
    expect(l1).toMatchObject({ id: "L1", key: "essence", zh: "本质", order: 1 });
  });
});

describe("SEED_FIELDS", () => {
  it("seeds L1 with a required mission line and supporting text fields", () => {
    const l1 = getSeedFields("L1");
    const byKey = Object.fromEntries(l1.map((field) => [field.key, field]));

    expect(byKey.mission).toMatchObject({ kind: "line", required: true });
    expect(byKey.why).toMatchObject({ kind: "text" });
    expect(byKey.technical_belief).toMatchObject({ kind: "text" });
  });

  it("marks the spec-required structured anchor fields as required", () => {
    expect(getSeedFields("L4").find((field) => field.key === "positioning")).toMatchObject({
      kind: "structured",
      required: true,
    });
    expect(getSeedFields("L5").find((field) => field.key === "jtbd")).toMatchObject({
      kind: "structured",
      required: true,
    });
    expect(getSeedFields("L6").find((field) => field.key === "icp")).toMatchObject({
      kind: "structured",
      required: true,
    });
  });

  it("seeds L8 (identity) with the full Lovable-style brand-kit floor", () => {
    const keys = getSeedFields("L8").map((field) => field.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "logo",
        "colors",
        "fonts",
        "images",
        "design_guide",
        "brand_guide",
        "archetype",
        "tone",
      ]),
    );

    const byKey = Object.fromEntries(getSeedFields("L8").map((field) => [field.key, field]));
    expect(byKey.logo.kind).toBe("asset");
    expect(byKey.colors.kind).toBe("asset");
    expect(byKey.fonts.kind).toBe("asset");
    expect(byKey.images.kind).toBe("asset");
    expect(byKey.archetype.kind).toBe("structured");
    expect(byKey.tone.kind).toBe("list");
  });

  it("seeds L9 (execution) with live OKR / roadmap fields and a link-kind live_runs", () => {
    const keys = getSeedFields("L9").map((field) => field.key);
    expect(keys).toEqual(expect.arrayContaining(["okrs", "roadmap", "nsm", "bets", "live_runs"]));

    const byKey = Object.fromEntries(getSeedFields("L9").map((field) => [field.key, field]));
    expect(byKey.live_runs.kind).toBe("link");
    expect(byKey.nsm.kind).toBe("line");
    expect(byKey.bets.kind).toBe("list");
  });

  it("never marks a field as required outside the spec-required set", () => {
    const requiredByLayer: Partial<Record<LayerId, readonly string[]>> = {
      L1: ["mission"],
      L4: ["positioning"],
      L5: ["jtbd"],
      L6: ["icp"],
    };

    for (const layer of LAYER_REGISTRY) {
      const expected = requiredByLayer[layer.id] ?? [];
      const actualRequired = getSeedFields(layer.id)
        .filter((field) => field.required)
        .map((field) => field.key);
      expect(actualRequired).toEqual([...expected]);
    }
  });

  it("exposes a frozen registry and frozen seed-field arrays", () => {
    expect(Object.isFrozen(LAYER_REGISTRY)).toBe(true);
    expect(Object.isFrozen(SEED_FIELDS)).toBe(true);
    expect(Object.isFrozen(SEED_FIELDS.L1)).toBe(true);
  });
});
