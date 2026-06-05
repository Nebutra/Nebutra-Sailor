import { z } from "zod";
import type {
  CompanyContext,
  ContextFieldDefinition,
  ContextLayer,
  FieldProvenance,
  FieldValue,
  LayerId,
  Stage,
} from "./model";
import { FieldProvenanceSchema, FieldValueSchema, LAYER_IDS, LayerIdSchema } from "./model";
import { getSeedFields } from "./registry";

/**
 * Company Context repository — the storage seam for the nine-layer tower.
 *
 * This module owns the IMMUTABLE write rules for a project's company context:
 * every operation returns a fresh `CompanyContext` (never mutates), stamps
 * provenance on stored values, and protects `locked` (human-approved) fields
 * from casual overwrite. Persistence sits behind a small interface so the store
 * is swappable — this workflow ships only an in-memory implementation (keyless,
 * for tests); a Prisma JSON-document store + RLS lands in a later workflow.
 *
 * Timestamps are NEVER generated internally: callers inject `now` so the engine
 * stays deterministic and keyless-testable.
 */

/** Provenance-carrying metadata for an upsert. `provenance` is REQUIRED. */
export interface UpsertFieldMeta {
  readonly provenance: FieldProvenance;
  readonly now: string;
  readonly confidence?: number;
  readonly updatedBy?: string;
  readonly runId?: string;
  /** Required to overwrite a `locked` (human-approved) field. */
  readonly force?: boolean;
}

/**
 * Boundary validation for upsert metadata. `provenance` and `now` are required;
 * a missing provenance fails fast here rather than silently writing an unsourced
 * value. `now` is supplied by the caller — never minted inside the repository.
 */
const UpsertFieldMetaSchema = z.object({
  provenance: FieldProvenanceSchema,
  now: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  updatedBy: z.string().min(1).optional(),
  runId: z.string().min(1).optional(),
  force: z.boolean().optional(),
});

/**
 * The storage seam. ALL mutating methods return a new `CompanyContext` and
 * persist it; the previously returned object is never mutated. Implementations
 * keep timestamps caller-driven via the injected `now` argument.
 */
export interface CompanyContextRepository {
  get(projectId: string): CompanyContext | undefined;
  save(ctx: CompanyContext): void;
  getLayer(projectId: string, layerId: LayerId): ContextLayer | undefined;
  upsertField(
    projectId: string,
    layerId: LayerId,
    fieldKey: string,
    value: unknown,
    meta: UpsertFieldMeta,
  ): CompanyContext;
  addField(
    projectId: string,
    layerId: LayerId,
    def: ContextFieldDefinition,
    now: string,
  ): CompanyContext;
  deleteField(projectId: string, layerId: LayerId, fieldKey: string, now: string): CompanyContext;
  lockField(projectId: string, layerId: LayerId, fieldKey: string, now: string): CompanyContext;
  unlockField(projectId: string, layerId: LayerId, fieldKey: string, now: string): CompanyContext;
}

/** Build one fully-seeded layer with every value status set to "empty". */
function seedLayer(layerId: LayerId, now: string): ContextLayer {
  const definitions = getSeedFields(layerId);

  const fields: Record<string, ContextFieldDefinition> = Object.fromEntries(
    definitions.map((definition) => [definition.key, { ...definition }]),
  );

  const values: Record<string, FieldValue> = Object.fromEntries(
    definitions.map((definition) => [definition.key, emptyValue(layerId, definition, now)]),
  );

  return { id: layerId, fields, values };
}

/** A pristine, value-free placeholder for a freshly seeded or added field. */
function emptyValue(layerId: LayerId, definition: ContextFieldDefinition, now: string): FieldValue {
  return {
    layerId,
    fieldKey: definition.key,
    kind: definition.kind,
    value: undefined,
    status: "empty",
    provenance: "agent",
    updatedAt: now,
  };
}

/**
 * Seed an empty nine-layer company context for a project. Every canonical layer
 * is materialised from the registry's seed fields, and every stored value starts
 * with status "empty". `now` is injected (deterministic, keyless).
 */
export function createEmptyContext(projectId: string, stage: Stage, now: string): CompanyContext {
  const layers = Object.fromEntries(
    LAYER_IDS.map((id) => [id, seedLayer(id, now)] as const),
  ) as Record<LayerId, ContextLayer>;

  return { projectId, stage, layers, updatedAt: now };
}

/** Validate a layer id at the boundary — an unknown id is a programming error. */
function assertLayerId(layerId: LayerId): LayerId {
  return LayerIdSchema.parse(layerId);
}

/** Immutably replace one layer inside a context, bumping the context timestamp. */
function withLayer(
  ctx: CompanyContext,
  layerId: LayerId,
  layer: ContextLayer,
  now: string,
): CompanyContext {
  return {
    ...ctx,
    layers: { ...ctx.layers, [layerId]: layer },
    updatedAt: now,
  };
}

/**
 * In-memory company-context store (Map-backed). Keyless and deterministic — the
 * default store for unit tests. A Prisma-backed implementation will satisfy the
 * same `CompanyContextRepository` interface without touching callers.
 */
export class InMemoryCompanyContextRepository implements CompanyContextRepository {
  private readonly store = new Map<string, CompanyContext>();

  get(projectId: string): CompanyContext | undefined {
    return this.store.get(projectId);
  }

  save(ctx: CompanyContext): void {
    this.store.set(ctx.projectId, ctx);
  }

  getLayer(projectId: string, layerId: LayerId): ContextLayer | undefined {
    const id = assertLayerId(layerId);
    return this.get(projectId)?.layers[id];
  }

  upsertField(
    projectId: string,
    layerId: LayerId,
    fieldKey: string,
    value: unknown,
    meta: UpsertFieldMeta,
  ): CompanyContext {
    const validMeta = UpsertFieldMetaSchema.parse(meta);
    const id = assertLayerId(layerId);
    const { ctx, layer } = this.requireLayer(projectId, id);

    const definition = layer.fields[fieldKey];
    if (definition === undefined) {
      throw new Error(`Unknown field "${fieldKey}" on layer ${id} for project ${projectId}.`);
    }

    const existing = layer.values[fieldKey];
    if (existing?.status === "locked" && validMeta.force !== true) {
      throw new Error(
        `Field "${fieldKey}" on layer ${id} is locked; pass force:true to overwrite a human-approved value.`,
      );
    }

    // A forced overwrite of a locked field keeps it locked (still approved);
    // any other write moves the value into the "draft" review state.
    const nextStatus = existing?.status === "locked" ? "locked" : "draft";

    const nextValue: FieldValue = FieldValueSchema.parse({
      layerId: id,
      fieldKey,
      kind: definition.kind,
      value,
      status: nextStatus,
      provenance: validMeta.provenance,
      confidence: validMeta.confidence,
      updatedBy: validMeta.updatedBy,
      updatedAt: validMeta.now,
      runId: validMeta.runId,
    });

    const nextLayer: ContextLayer = {
      ...layer,
      values: { ...layer.values, [fieldKey]: nextValue },
    };
    const next = withLayer(ctx, id, nextLayer, validMeta.now);
    this.save(next);
    return next;
  }

  addField(
    projectId: string,
    layerId: LayerId,
    def: ContextFieldDefinition,
    now: string,
  ): CompanyContext {
    const id = assertLayerId(layerId);
    const { ctx, layer } = this.requireLayer(projectId, id);
    const definition: ContextFieldDefinition = { ...def };

    const nextLayer: ContextLayer = {
      ...layer,
      fields: { ...layer.fields, [definition.key]: definition },
      values: { ...layer.values, [definition.key]: emptyValue(id, definition, now) },
    };
    const next = withLayer(ctx, id, nextLayer, now);
    this.save(next);
    return next;
  }

  deleteField(projectId: string, layerId: LayerId, fieldKey: string, now: string): CompanyContext {
    const id = assertLayerId(layerId);
    const { ctx, layer } = this.requireLayer(projectId, id);

    const { [fieldKey]: _droppedField, ...remainingFields } = layer.fields;
    const { [fieldKey]: _droppedValue, ...remainingValues } = layer.values;

    const nextLayer: ContextLayer = {
      ...layer,
      fields: remainingFields,
      values: remainingValues,
    };
    const next = withLayer(ctx, id, nextLayer, now);
    this.save(next);
    return next;
  }

  lockField(projectId: string, layerId: LayerId, fieldKey: string, now: string): CompanyContext {
    return this.setStatus(projectId, layerId, fieldKey, "locked", now);
  }

  unlockField(projectId: string, layerId: LayerId, fieldKey: string, now: string): CompanyContext {
    return this.setStatus(projectId, layerId, fieldKey, "ready", now);
  }

  /** Shared lock/unlock body — immutably re-stamp a stored value's status. */
  private setStatus(
    projectId: string,
    layerId: LayerId,
    fieldKey: string,
    status: FieldValue["status"],
    now: string,
  ): CompanyContext {
    const id = assertLayerId(layerId);
    const { ctx, layer } = this.requireLayer(projectId, id);

    const existing = layer.values[fieldKey];
    if (existing === undefined) {
      throw new Error(`Unknown field "${fieldKey}" on layer ${id} for project ${projectId}.`);
    }

    const nextValue: FieldValue = { ...existing, status, updatedAt: now };
    const nextLayer: ContextLayer = {
      ...layer,
      values: { ...layer.values, [fieldKey]: nextValue },
    };
    const next = withLayer(ctx, id, nextLayer, now);
    this.save(next);
    return next;
  }

  /** Resolve a project's context + a specific layer, or throw a clear error. */
  private requireLayer(
    projectId: string,
    layerId: LayerId,
  ): { ctx: CompanyContext; layer: ContextLayer } {
    const ctx = this.get(projectId);
    if (ctx === undefined) {
      throw new Error(`No company context found for project ${projectId}.`);
    }
    const layer = ctx.layers[layerId];
    if (layer === undefined) {
      throw new Error(`Layer ${layerId} missing on company context for project ${projectId}.`);
    }
    return { ctx, layer };
  }
}
