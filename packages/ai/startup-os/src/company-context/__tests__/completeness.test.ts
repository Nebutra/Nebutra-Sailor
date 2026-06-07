import { describe, expect, it } from "vitest";
import { buildManifest, computeLayerCompleteness } from "../completeness";
import type {
  CompanyContext,
  ContextFieldDefinition,
  ContextLayer,
  FieldValue,
  LayerId,
  Stage,
} from "../model";
import { LAYER_IDS } from "../model";

/** Minimal field definition factory for tests. */
function field(
  key: string,
  overrides: Partial<ContextFieldDefinition> = {},
): ContextFieldDefinition {
  return {
    key,
    label: overrides.label ?? key,
    kind: overrides.kind ?? "line",
    required: overrides.required ?? false,
  };
}

/** A stored value factory; defaults to a non-empty status. */
function value(
  layerId: LayerId,
  fieldKey: string,
  overrides: Partial<FieldValue> = {},
): FieldValue {
  return {
    layerId,
    fieldKey,
    kind: overrides.kind ?? "line",
    value: overrides.value ?? `value of ${fieldKey}`,
    status: overrides.status ?? "ready",
    provenance: overrides.provenance ?? "user",
    updatedAt: overrides.updatedAt ?? "2026-06-05T00:00:00.000Z",
    ...overrides,
  };
}

/** Build an empty layer for every id, optionally overriding a couple. */
function emptyLayers(): Record<LayerId, ContextLayer> {
  const entries = LAYER_IDS.map((id) => [id, { id, fields: {}, values: {} }] as const);
  return Object.fromEntries(entries) as Record<LayerId, ContextLayer>;
}

function context(layers: Record<LayerId, ContextLayer>, stage: Stage = "pre_seed"): CompanyContext {
  return {
    projectId: "startup_test",
    stage,
    layers,
    updatedAt: "2026-06-05T00:00:00.000Z",
  };
}

describe("computeLayerCompleteness", () => {
  it("reports an empty required layer as completeness 0 / status 'empty'", () => {
    const layer: ContextLayer = {
      id: "L1",
      fields: { mission: field("mission", { required: true }) },
      values: {},
    };

    expect(computeLayerCompleteness(layer)).toEqual({
      completeness: 0,
      status: "empty",
    });
  });

  it("reports a layer with its single required field filled as ready", () => {
    const layer: ContextLayer = {
      id: "L1",
      fields: { mission: field("mission", { required: true }) },
      values: { mission: value("L1", "mission") },
    };

    expect(computeLayerCompleteness(layer)).toEqual({
      completeness: 1,
      status: "ready",
    });
  });

  it("treats a value with status 'empty' as not filled", () => {
    const layer: ContextLayer = {
      id: "L1",
      fields: { mission: field("mission", { required: true }) },
      values: { mission: value("L1", "mission", { status: "empty" }) },
    };

    expect(computeLayerCompleteness(layer)).toEqual({
      completeness: 0,
      status: "empty",
    });
  });

  it("reports 'partial' when only some required fields are filled", () => {
    const layer: ContextLayer = {
      id: "L4",
      fields: {
        positioning: field("positioning", { kind: "structured", required: true }),
        category: field("category", { required: true }),
      },
      values: {
        positioning: value("L4", "positioning", { kind: "structured", value: { x: 1 } }),
      },
    };

    expect(computeLayerCompleteness(layer)).toEqual({
      completeness: 0.5,
      status: "partial",
    });
  });

  it("falls back to any-field completeness when a layer has no required fields", () => {
    const empty: ContextLayer = {
      id: "L2",
      fields: { vision: field("vision"), bhag: field("bhag", { kind: "structured" }) },
      values: {},
    };
    const partial: ContextLayer = {
      ...empty,
      values: { vision: value("L2", "vision") },
    };

    expect(computeLayerCompleteness(empty)).toEqual({ completeness: 0, status: "empty" });
    expect(computeLayerCompleteness(partial)).toEqual({ completeness: 0.5, status: "partial" });
  });

  it("treats a layer with no fields at all as empty", () => {
    const layer: ContextLayer = { id: "L3", fields: {}, values: {} };

    expect(computeLayerCompleteness(layer)).toEqual({ completeness: 0, status: "empty" });
  });
});

describe("buildManifest", () => {
  it("returns one manifest entry per canonical layer, in registry order", () => {
    const manifest = buildManifest(context(emptyLayers()));

    expect(manifest.projectId).toBe("startup_test");
    expect(manifest.stage).toBe("pre_seed");
    expect(manifest.layers.map((layer) => layer.id)).toEqual([...LAYER_IDS]);
  });

  it("reports an empty context as completeness 0 / status 'empty' on every layer", () => {
    const manifest = buildManifest(context(emptyLayers()));

    for (const layer of manifest.layers) {
      expect(layer.completeness).toBe(0);
      expect(layer.status).toBe("empty");
    }
  });

  it("marks L1 ready once its required mission field is filled", () => {
    const layers = emptyLayers();
    const l1: ContextLayer = {
      id: "L1",
      fields: { mission: field("mission", { required: true }) },
      values: { mission: value("L1", "mission") },
    };
    const manifest = buildManifest(context({ ...layers, L1: l1 }));
    const l1Entry = manifest.layers.find((layer) => layer.id === "L1");

    expect(l1Entry?.status).toBe("ready");
    expect(l1Entry?.completeness).toBe(1);
  });

  it("carries the Chinese label and stability for each layer from the registry", () => {
    const manifest = buildManifest(context(emptyLayers()));
    const byId = new Map(manifest.layers.map((layer) => [layer.id, layer]));

    expect(byId.get("L1")?.zh).toBe("本质");
    expect(byId.get("L1")?.stability).toBe("century");
    expect(byId.get("L9")?.zh).toBe("执行");
    expect(byId.get("L9")?.stability).toBe("weekly");
  });

  it("exposes field KEYS only and NEVER stored values (progressive disclosure)", () => {
    const layers = emptyLayers();
    const secret = "TOP_SECRET_MISSION_STRING";
    const l1: ContextLayer = {
      id: "L1",
      fields: { mission: field("mission", { required: true }) },
      values: { mission: value("L1", "mission", { value: secret }) },
    };
    const manifest = buildManifest(context({ ...layers, L1: l1 }));
    const l1Entry = manifest.layers.find((layer) => layer.id === "L1");

    expect(l1Entry?.fieldKeys).toContain("mission");
    // The whole serialized manifest must not leak any stored value text.
    expect(JSON.stringify(manifest)).not.toContain(secret);
  });

  it("marks pre_seed pending layers as L1, L5, L6, L9 only", () => {
    const manifest = buildManifest(context(emptyLayers(), "pre_seed"));
    const pending = manifest.layers
      .filter((layer) => layer.pendingForStage)
      .map((layer) => layer.id);

    expect(pending).toEqual(["L1", "L5", "L6", "L9"]);
  });

  it("widens pending layers as the stage advances (seed adds L2, L4, L7)", () => {
    const manifest = buildManifest(context(emptyLayers(), "seed"));
    const pending = new Set(
      manifest.layers.filter((layer) => layer.pendingForStage).map((layer) => layer.id),
    );

    for (const id of ["L1", "L2", "L4", "L5", "L6", "L7", "L9"] as const) {
      expect(pending.has(id)).toBe(true);
    }
    expect(pending.has("L3")).toBe(false);
    expect(pending.has("L8")).toBe(false);
  });

  it("marks every canonical layer pending at post_a", () => {
    const manifest = buildManifest(context(emptyLayers(), "post_a"));

    expect(manifest.layers.every((layer) => layer.pendingForStage)).toBe(true);
  });
});
