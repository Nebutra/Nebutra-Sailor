import { tool } from "ai";
import { z } from "zod";
import { buildManifest } from "./completeness";
import type { CompanyContext, ContextLayer, ContextManifest, FieldValue, LayerId } from "./model";
import { FieldKindSchema, FieldProvenanceSchema, LayerIdSchema } from "./model";
import type { CompanyContextRepository } from "./repository";

/**
 * Company Context tool surface — the in-process AI-SDK tool set (MCP-ready
 * later) over the {@link CompanyContextRepository} seam.
 *
 * Two halves:
 *   1. PURE FUNCTIONS over a repository — `describe` / `getLayer` / `getField` /
 *      `search` / `upsertField` / `addField` / `deleteField` / `lock`/`unlock`.
 *      They hold the progressive-disclosure invariant: `describe` returns the
 *      CHEAP, value-free manifest so an agent never receives the whole tower;
 *      it fetches layer/field slices on demand.
 *   2. `createCompanyContextTools(repo)` — the AI-SDK `tool()` set keyed by name
 *      (`companyContext_describe`, …), each with a zod `inputSchema` delegating
 *      to a pure function. KEYLESS: no model is ever invoked here. Timestamps
 *      come from an injectable `now` clock so the tools stay deterministic and
 *      testable without a real key.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Pure functions over the repository seam
// ─────────────────────────────────────────────────────────────────────────────

/** A single search hit — layer + field + a human-readable snippet. */
export interface ContextSearchHit {
  readonly layerId: LayerId;
  readonly fieldKey: string;
  readonly snippet: string;
}

/** Provenance-carrying metadata for an `upsertField` call. `provenance` required. */
export interface UpsertFieldInput {
  readonly provenance: FieldValue["provenance"];
  readonly now: string;
  readonly confidence?: number;
  readonly updatedBy?: string;
  readonly runId?: string;
  /** Required to overwrite a `locked` (human-approved) field. */
  readonly force?: boolean;
}

/** Definition for an extensible field added at runtime via `addField`. */
export interface AddFieldInput {
  readonly key: string;
  readonly label: string;
  readonly kind: FieldValue["kind"];
  readonly required?: boolean;
}

/** Resolve a project's context or throw a clear, boundary-level error. */
function requireContext(repo: CompanyContextRepository, projectId: string): CompanyContext {
  const ctx = repo.get(projectId);
  if (ctx === undefined) {
    throw new Error(`No company context found for project ${projectId}.`);
  }
  return ctx;
}

/**
 * The CHEAP, value-free manifest for a project (progressive disclosure). The
 * result carries layer readiness + field KEYS only — never a stored value — so
 * an agent can plan a context fetch without loading the whole tower.
 */
export function describe(repo: CompanyContextRepository, projectId: string): ContextManifest {
  return buildManifest(requireContext(repo, projectId));
}

/** Lazy read: a single layer's fields + provenance-carrying values. */
export function getLayer(
  repo: CompanyContextRepository,
  projectId: string,
  layerId: LayerId,
): ContextLayer | undefined {
  return repo.getLayer(projectId, layerId);
}

/** Lazy read: a single stored field value (with provenance), or undefined. */
export function getField(
  repo: CompanyContextRepository,
  projectId: string,
  layerId: LayerId,
  fieldKey: string,
): FieldValue | undefined {
  return repo.getLayer(projectId, layerId)?.values[fieldKey];
}

/** Coerce a stored field value into a searchable string (only string-ish values). */
function searchableText(value: FieldValue): string | undefined {
  if (typeof value.value === "string") {
    return value.value;
  }
  return undefined;
}

/**
 * Find stored values by case-insensitive substring across the whole tower
 * (string values only) — lets an agent locate a field without reading every
 * layer. Layers are scanned in canonical registry order via the manifest.
 */
export function search(
  repo: CompanyContextRepository,
  projectId: string,
  query: string,
): readonly ContextSearchHit[] {
  const ctx = requireContext(repo, projectId);
  const needle = query.toLowerCase();
  if (needle.length === 0) {
    return [];
  }

  const manifest = buildManifest(ctx);
  const hits: ContextSearchHit[] = [];

  for (const manifestLayer of manifest.layers) {
    const layer = ctx.layers[manifestLayer.id];
    if (layer === undefined) {
      continue;
    }
    for (const fieldKey of manifestLayer.fieldKeys) {
      const stored = layer.values[fieldKey];
      if (stored === undefined) {
        continue;
      }
      const text = searchableText(stored);
      if (text !== undefined && text.toLowerCase().includes(needle)) {
        hits.push({ layerId: manifestLayer.id, fieldKey, snippet: text });
      }
    }
  }

  return hits;
}

/** Upsert a field value with REQUIRED provenance — delegates to the repository. */
export function upsertField(
  repo: CompanyContextRepository,
  projectId: string,
  layerId: LayerId,
  fieldKey: string,
  value: unknown,
  meta: UpsertFieldInput,
): CompanyContext {
  return repo.upsertField(projectId, layerId, fieldKey, value, meta);
}

/** Add an extensible field to a layer at runtime. */
export function addField(
  repo: CompanyContextRepository,
  projectId: string,
  layerId: LayerId,
  def: AddFieldInput,
  now: string,
): CompanyContext {
  return repo.addField(
    projectId,
    layerId,
    { key: def.key, label: def.label, kind: def.kind, required: def.required ?? false },
    now,
  );
}

/** Remove a field (definition + stored value) from a layer. */
export function deleteField(
  repo: CompanyContextRepository,
  projectId: string,
  layerId: LayerId,
  fieldKey: string,
  now: string,
): CompanyContext {
  return repo.deleteField(projectId, layerId, fieldKey, now);
}

/** Lock a field: mark it human-approved + overwrite-protected. */
export function lockField(
  repo: CompanyContextRepository,
  projectId: string,
  layerId: LayerId,
  fieldKey: string,
  now: string,
): CompanyContext {
  return repo.lockField(projectId, layerId, fieldKey, now);
}

/** Unlock a previously-locked field back into the "ready" state. */
export function unlockField(
  repo: CompanyContextRepository,
  projectId: string,
  layerId: LayerId,
  fieldKey: string,
  now: string,
): CompanyContext {
  return repo.unlockField(projectId, layerId, fieldKey, now);
}

// ─────────────────────────────────────────────────────────────────────────────
// AI-SDK tool set
// ─────────────────────────────────────────────────────────────────────────────

/** Injectable, deterministic clock — defaults to wall-clock ISO time. */
export interface CompanyContextToolOptions {
  readonly now?: () => string;
}

/** Shared projectId field reused across every tool input schema. */
const projectIdField = z.string().min(1).describe("Startup OS project id.");

/** Boundary schema: describe / get-whole-layer inputs. */
const describeInputSchema = z.object({ projectId: projectIdField });

const getLayerInputSchema = z.object({
  projectId: projectIdField,
  layerId: LayerIdSchema.describe("Tower layer id, L1 (essence) -> L9 (execution)."),
});

const getFieldInputSchema = z.object({
  projectId: projectIdField,
  layerId: LayerIdSchema,
  fieldKey: z.string().min(1).describe("Field key within the layer."),
});

const searchInputSchema = z.object({
  projectId: projectIdField,
  query: z.string().min(1).describe("Case-insensitive substring to find in stored values."),
});

const upsertFieldInputSchema = z.object({
  projectId: projectIdField,
  layerId: LayerIdSchema,
  fieldKey: z.string().min(1),
  value: z.unknown().describe("New field value; validated per the field's kind by the store."),
  // provenance is REQUIRED — a missing source must fail at the boundary, never
  // silently write an unsourced value.
  provenance: FieldProvenanceSchema.describe("Where this value came from. REQUIRED."),
  confidence: z.number().min(0).max(1).optional(),
  updatedBy: z.string().min(1).optional(),
  runId: z.string().min(1).optional(),
  force: z.boolean().optional().describe("Pass true to overwrite a locked (approved) value."),
});

const addFieldInputSchema = z.object({
  projectId: projectIdField,
  layerId: LayerIdSchema,
  key: z.string().min(1),
  label: z.string().min(1),
  kind: FieldKindSchema,
  required: z.boolean().optional(),
});

const deleteFieldInputSchema = z.object({
  projectId: projectIdField,
  layerId: LayerIdSchema,
  fieldKey: z.string().min(1),
});

const lockFieldInputSchema = z.object({
  projectId: projectIdField,
  layerId: LayerIdSchema,
  fieldKey: z.string().min(1),
});

/**
 * Build the in-process AI-SDK tool set over a repository. Keyless: no model is
 * invoked. Every tool delegates to a pure function above; timestamps come from
 * the injected `now` clock so behaviour is deterministic in tests.
 */
export function createCompanyContextTools(
  repo: CompanyContextRepository,
  options: CompanyContextToolOptions = {},
) {
  const now = options.now ?? (() => new Date().toISOString());

  return {
    companyContext_describe: tool({
      description:
        "Cheap, value-free manifest of a project's nine-layer company context (progressive disclosure). Returns layer readiness + field KEYS only, never stored values.",
      inputSchema: describeInputSchema,
      execute: async ({ projectId }) => describe(repo, projectId),
    }),

    companyContext_getLayer: tool({
      description:
        "Lazy read of one tower layer: its field definitions and provenance-carrying stored values.",
      inputSchema: getLayerInputSchema,
      execute: async ({ projectId, layerId }) => getLayer(repo, projectId, layerId) ?? null,
    }),

    companyContext_getField: tool({
      description: "Lazy read of a single stored field value (with provenance) in a tower layer.",
      inputSchema: getFieldInputSchema,
      execute: async ({ projectId, layerId, fieldKey }) =>
        getField(repo, projectId, layerId, fieldKey) ?? null,
    }),

    companyContext_search: tool({
      description:
        "Find stored string values by case-insensitive substring across the tower, returning {layerId, fieldKey, snippet} hits without reading every layer.",
      inputSchema: searchInputSchema,
      execute: async ({ projectId, query }) => search(repo, projectId, query),
    }),

    companyContext_upsertField: tool({
      description:
        "Write a field value with REQUIRED provenance. Overwriting a locked (human-approved) value requires force:true.",
      inputSchema: upsertFieldInputSchema,
      execute: async ({
        projectId,
        layerId,
        fieldKey,
        value,
        provenance,
        confidence,
        updatedBy,
        runId,
        force,
      }) => {
        return upsertField(repo, projectId, layerId, fieldKey, value, {
          provenance,
          ...(confidence !== undefined ? { confidence } : {}),
          ...(updatedBy !== undefined ? { updatedBy } : {}),
          ...(runId !== undefined ? { runId } : {}),
          ...(force !== undefined ? { force } : {}),
          now: now(),
        });
      },
    }),

    companyContext_addField: tool({
      description:
        "Add an extensible field (key/label/kind/required?) to a tower layer at runtime.",
      inputSchema: addFieldInputSchema,
      execute: async ({ projectId, layerId, key, label, kind, required }) =>
        addField(
          repo,
          projectId,
          layerId,
          { key, label, kind, ...(required !== undefined ? { required } : {}) },
          now(),
        ),
    }),

    companyContext_deleteField: tool({
      description: "Delete a field (definition + stored value) from a tower layer.",
      inputSchema: deleteFieldInputSchema,
      execute: async ({ projectId, layerId, fieldKey }) =>
        deleteField(repo, projectId, layerId, fieldKey, now()),
    }),

    companyContext_lockField: tool({
      description: "Lock a field: mark it human-approved and overwrite-protected.",
      inputSchema: lockFieldInputSchema,
      execute: async ({ projectId, layerId, fieldKey }) =>
        lockField(repo, projectId, layerId, fieldKey, now()),
    }),

    companyContext_unlockField: tool({
      description: "Unlock a previously-locked field back into the ready state.",
      inputSchema: lockFieldInputSchema,
      execute: async ({ projectId, layerId, fieldKey }) =>
        unlockField(repo, projectId, layerId, fieldKey, now()),
    }),
  };
}
