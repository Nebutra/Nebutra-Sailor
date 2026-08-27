import { z } from "zod";

/**
 * Company Context — the nine-layer "tower" (九层塔) model.
 *
 * This module is PURE: types + zod schemas only. No logic, no I/O. It is the
 * AI-native source of truth for a Startup OS project's company identity and
 * replaces the old flat `CompanyContext` interface (name/category/market/...)
 * and its hardcoded regex heuristics in `../compiler.ts`.
 *
 * The nine layers are a FIXED registry expressed as DATA (order 1..9,
 * bottom -> top). Layer behavior never code-branches on layer id; it reads the
 * registry. Fields inside a layer are EXTENSIBLE — agents/users may add or
 * delete fields — and every stored value carries provenance.
 */

/** The nine canonical layer ids, bottom (L1 essence) -> top (L9 execution). */
export const LAYER_IDS = ["L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L9"] as const;
export type LayerId = (typeof LAYER_IDS)[number];
export const LayerIdSchema = z.enum(LAYER_IDS);

/** How often a layer's content is expected to change (slowest -> fastest). */
export const STABILITIES = [
  "century",
  "decades",
  "years",
  "years_1_3",
  "years_1_2",
  "years_5_plus",
  "quarter",
  "half_year",
  "weekly",
] as const;
export type Stability = (typeof STABILITIES)[number];
export const StabilitySchema = z.enum(STABILITIES);

/** Fundraising / maturity stage — drives progressive disclosure hints only. */
export const STAGES = ["pre_seed", "seed", "series_a", "post_a"] as const;
export type Stage = (typeof STAGES)[number];
export const StageSchema = z.enum(STAGES);

/** The shape of a single field's value. */
export const FIELD_KINDS = ["line", "text", "list", "structured", "asset", "link"] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];
export const FieldKindSchema = z.enum(FIELD_KINDS);

/** Lifecycle of a stored field value. `locked` = human-approved, overwrite-protected. */
export const FIELD_STATUSES = ["empty", "draft", "ready", "locked"] as const;
export type FieldStatus = (typeof FIELD_STATUSES)[number];
export const FieldStatusSchema = z.enum(FIELD_STATUSES);

/** Where a stored field value came from. */
export const FIELD_PROVENANCES = ["user", "ai", "document", "agent"] as const;
export type FieldProvenance = (typeof FIELD_PROVENANCES)[number];
export const FieldProvenanceSchema = z.enum(FIELD_PROVENANCES);

/**
 * Definition of a field within a layer (schema-level metadata, not a value).
 * Fields are extensible: seed fields ship with the registry, agents/users add
 * more at runtime via `addField`.
 */
export interface ContextFieldDefinition {
  readonly key: string;
  readonly label: string;
  readonly kind: FieldKind;
  readonly required: boolean;
}

export const ContextFieldDefinitionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  kind: FieldKindSchema,
  required: z.boolean(),
});

/**
 * A stored field value carrying provenance — the AI-native core. `value` is
 * intentionally `unknown` here; per-field validation (against the field's
 * `kind`) happens in the engine layer, not in this pure model.
 */
export const FieldValueSchema = z.object({
  layerId: LayerIdSchema,
  fieldKey: z.string().min(1),
  kind: FieldKindSchema,
  value: z.unknown(),
  status: FieldStatusSchema.default("empty"),
  provenance: FieldProvenanceSchema,
  confidence: z.number().min(0).max(1).optional(),
  updatedBy: z.string().min(1).optional(),
  updatedAt: z.string().min(1),
  runId: z.string().min(1).optional(),
});

export type FieldValue = z.infer<typeof FieldValueSchema>;

/**
 * One layer of the tower: its field definitions and the values stored against
 * them, both keyed by field key. Readonly — updates produce new objects.
 */
export interface ContextLayer {
  readonly id: LayerId;
  readonly fields: Record<string, ContextFieldDefinition>;
  readonly values: Record<string, FieldValue>;
}

/**
 * The whole nine-layer company context for a project. Readonly — every mutation
 * (upsert/addField/lock/...) returns a fresh `CompanyContext`.
 */
export interface CompanyContext {
  readonly projectId: string;
  readonly stage: Stage;
  readonly layers: Record<LayerId, ContextLayer>;
  readonly updatedAt: string;
}

/** Aggregate readiness of a single layer for the manifest. */
export type ManifestLayerStatus = "empty" | "partial" | "ready";

/**
 * One layer entry in the cheap manifest. Carries field KEYS only — NEVER the
 * values — so agents can plan a context fetch without loading the whole tower
 * (progressive disclosure, the load-bearing principle).
 */
export interface ContextManifestLayer {
  readonly id: LayerId;
  readonly zh: string;
  readonly stability: Stability;
  readonly completeness: number;
  readonly status: ManifestLayerStatus;
  readonly fieldKeys: readonly string[];
  readonly pendingForStage: boolean;
}

/**
 * The cheap, value-free description of a project's company context. This is
 * what agents receive first; they then fetch layer/field slices on demand.
 */
export interface ContextManifest {
  readonly projectId: string;
  readonly stage: Stage;
  readonly layers: readonly ContextManifestLayer[];
}
