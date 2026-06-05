import type {
  CompanyContext,
  ContextLayer,
  ContextManifest,
  ContextManifestLayer,
  LayerId,
  ManifestLayerStatus,
  Stage,
} from "./model";
import { LAYER_IDS } from "./model";
import { getLayerMeta } from "./registry";

/**
 * Completeness + manifest engine for the nine-layer company context tower.
 *
 * Two responsibilities:
 *   1. `computeLayerCompleteness` — readiness ratio + status of a single layer.
 *   2. `buildManifest` — the CHEAP, value-free description an agent receives
 *      first (progressive disclosure, the load-bearing principle). The manifest
 *      carries field KEYS only and NEVER any stored value, so an agent can plan
 *      a context fetch without loading the whole tower.
 *
 * Layer metadata (Chinese label + change cadence) is canonical DATA — never a
 * code branch on layer id. It is sourced from the single registry
 * (`getLayerMeta` in `./registry`), so there is no duplicated layer table here.
 */

/**
 * Per-stage "fill these first" hints. Non-blocking — a stage layers the prior
 * stage's pending set with its own additions (cumulative, bottom-up maturity).
 */
const STAGE_PENDING_LAYERS: Readonly<Record<Stage, readonly LayerId[]>> = {
  pre_seed: ["L1", "L5", "L6", "L9"],
  seed: ["L1", "L5", "L6", "L9", "L2", "L4", "L7"],
  series_a: ["L1", "L5", "L6", "L9", "L2", "L4", "L7", "L3"],
  post_a: [...LAYER_IDS],
};

/** A field counts as filled once it holds a non-"empty" stored value. */
function isFilled(layer: ContextLayer, fieldKey: string): boolean {
  const stored = layer.values[fieldKey];
  return stored !== undefined && stored.status !== "empty";
}

/** Map a 0..1 completeness ratio into the coarse manifest status. */
function statusFromRatio(filled: number, total: number): ManifestLayerStatus {
  if (total === 0 || filled === 0) {
    return "empty";
  }
  return filled >= total ? "ready" : "partial";
}

/**
 * Completeness of a single layer.
 *
 * Ratio is over REQUIRED seed fields (a field counts as filled when its stored
 * value status is not "empty"). When a layer declares no required fields, the
 * ratio falls back to ANY field so progress is still visible. A layer with no
 * fields at all is empty.
 */
export function computeLayerCompleteness(layer: ContextLayer): {
  completeness: number;
  status: ManifestLayerStatus;
} {
  const definitions = Object.values(layer.fields);
  const required = definitions.filter((definition) => definition.required);
  const scope = required.length > 0 ? required : definitions;

  if (scope.length === 0) {
    return { completeness: 0, status: "empty" };
  }

  const filled = scope.filter((definition) => isFilled(layer, definition.key)).length;
  const completeness = filled / scope.length;

  return { completeness, status: statusFromRatio(filled, scope.length) };
}

/** Field KEYS only — the manifest must NEVER carry stored values. */
function fieldKeysOf(layer: ContextLayer): readonly string[] {
  return Object.keys(layer.fields);
}

/** Build the cheap manifest entry for one layer (no values, ever). */
function buildManifestLayer(
  layer: ContextLayer,
  pending: ReadonlySet<LayerId>,
): ContextManifestLayer {
  const meta = getLayerMeta(layer.id);
  const { completeness, status } = computeLayerCompleteness(layer);

  return {
    id: layer.id,
    zh: meta.zh,
    stability: meta.stability,
    completeness,
    status,
    fieldKeys: fieldKeysOf(layer),
    pendingForStage: pending.has(layer.id),
  };
}

/**
 * Build the CHEAP, value-free manifest for a whole company context. Layers are
 * emitted in canonical registry order (L1 -> L9). The result carries field keys
 * and per-layer readiness only; `JSON.stringify(manifest)` never contains a
 * stored field value (progressive disclosure invariant).
 */
export function buildManifest(ctx: CompanyContext): ContextManifest {
  const pending = new Set<LayerId>(STAGE_PENDING_LAYERS[ctx.stage]);

  const layers = LAYER_IDS.map((id) => {
    const layer = ctx.layers[id] ?? { id, fields: {}, values: {} };
    return buildManifestLayer(layer, pending);
  });

  return {
    projectId: ctx.projectId,
    stage: ctx.stage,
    layers,
  };
}
