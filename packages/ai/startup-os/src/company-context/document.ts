import { z } from "zod";
import type { FieldValue } from "./model";
import { LayerIdSchema } from "./model";
import type { CompanyContextRepository } from "./repository";

/**
 * Company Context — document ingestion engine.
 *
 * `fillTowerFromDocument` extracts structured field values from a founder
 * document and bulk-upserts them into the nine-layer tower with provenance
 * "document". It mirrors the keyless, injectable-model contract used by the
 * Startup OS executor (`../../execution.ts`): every engine that needs an LLM
 * takes an injectable async `invokeModel`, so unit tests never need a real key.
 *
 *   - KEYLESS default (no `invokeModel`): deterministic — extract nothing and
 *     return `{ applied: [] }` without throwing or hitting the network.
 *   - WITH `invokeModel`: call it with a prompt, expect a JSON array of
 *     `{ layerId, fieldKey, value }`, zod-parse the boundary, and upsert each
 *     valid entry. Junk (non-JSON, wrong shape, unknown layer/field) is tolerated
 *     and skipped — the document path never fails the caller on a noisy model.
 *
 * Timestamps are caller-injected via `now` (deterministic, keyless-testable);
 * they are never minted inside this engine.
 */

/**
 * Injectable model port for document extraction. Takes a prompt and resolves to
 * the raw model text (expected, but not required, to be a JSON array). Mirroring
 * the executor's `invokeModel` injection keeps this engine keyless-testable.
 */
export type DocumentModelInvoker = (prompt: string) => Promise<string>;

export interface FillTowerFromDocumentInput {
  readonly projectId: string;
  /** The raw founder document text to extract field values from. */
  readonly text: string;
  /** Storage seam — where extracted values are upserted. */
  readonly repository: CompanyContextRepository;
  /** Optional model port. Omit for the deterministic keyless path (no extraction). */
  readonly invokeModel?: DocumentModelInvoker;
  /** Caller-injected clock — never minted internally. Defaults to `Date.now`. */
  readonly now?: () => string;
}

export interface FillTowerFromDocumentResult {
  readonly applied: readonly FieldValue[];
}

/**
 * One extracted field from the model. Validated at the boundary: `layerId` must
 * be a canonical layer, `fieldKey` a non-empty string, `value` arbitrary
 * (`unknown`). Per-field kind validation happens downstream in the repository.
 */
const ExtractedFieldSchema = z.object({
  layerId: LayerIdSchema,
  fieldKey: z.string().min(1),
  value: z.unknown(),
});

type ExtractedField = z.infer<typeof ExtractedFieldSchema>;

/** Strip a ```json fence the model may wrap its array in (mirror executor). */
function stripCodeFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
}

/**
 * Tolerantly parse the model's text into extracted fields. Returns an empty
 * array on any failure (non-JSON, non-array), and per-entry `safeParse` drops
 * malformed items while keeping the valid ones. Never throws.
 */
function parseExtractedFields(text: string): readonly ExtractedField[] {
  let raw: unknown;
  try {
    raw = JSON.parse(stripCodeFence(text));
  } catch {
    return [];
  }

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.flatMap((item) => {
    const parsed = ExtractedFieldSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

/** Build the extraction prompt handed to the injected model port. */
function buildDocumentPrompt(text: string): string {
  return JSON.stringify(
    {
      instruction:
        "Extract company-context field values from the document. Return strict JSON: an array of { layerId, fieldKey, value } where layerId is one of L1..L9. Omit anything you cannot ground in the text. Do not invent fields.",
      document: text,
    },
    null,
    2,
  );
}

/**
 * Extract structured field values from a founder document and bulk-upsert them
 * into the project's company-context tower with provenance "document".
 *
 * Keyless by default (no `invokeModel` => `{ applied: [] }`, no throw). With a
 * model, every successfully-upserted value is returned in `applied`; entries the
 * repository rejects (unknown field, etc.) are skipped without failing the call.
 */
export async function fillTowerFromDocument(
  input: FillTowerFromDocumentInput,
): Promise<FillTowerFromDocumentResult> {
  const { projectId, text, repository, invokeModel } = input;
  const now = input.now ?? (() => new Date().toISOString());

  if (invokeModel === undefined) {
    return { applied: [] };
  }

  let modelText: string;
  try {
    modelText = await invokeModel(buildDocumentPrompt(text));
  } catch {
    // A failing document model is non-fatal: extract nothing rather than error.
    return { applied: [] };
  }

  const extracted = parseExtractedFields(modelText);

  // Sequential upserts: each call persists on top of the prior result, so the
  // order matters. `flatMap` collects the stored values without spreading an
  // accumulator (O(n) instead of O(n^2)); a rejected entry contributes nothing.
  const applied = extracted.flatMap((field) => {
    try {
      const next = repository.upsertField(projectId, field.layerId, field.fieldKey, field.value, {
        provenance: "document",
        now: now(),
      });
      const stored = next.layers[field.layerId]?.values[field.fieldKey];
      return stored !== undefined ? [stored] : [];
    } catch {
      // Unknown field / locked / unknown project — skip this entry, keep going.
      return [];
    }
  });

  return { applied };
}
