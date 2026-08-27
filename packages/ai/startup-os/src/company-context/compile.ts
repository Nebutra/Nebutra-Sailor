import { z } from "zod";
import type { CompanyContext, FieldProvenance, Stage } from "./model";
import { LayerIdSchema } from "./model";
import {
  type CompanyContextRepository,
  createEmptyContext,
  InMemoryCompanyContextRepository,
} from "./repository";

/**
 * Tower compiler — seed a nine-layer company context from a founder thesis.
 *
 * This REPLACES the old flat `compileStartupProject` heuristics in `../compiler.ts`
 * (detectMarket / titleFromThesis / normalizePromise regex guessing). It makes NO
 * such guesses. Two paths, both keyless-testable:
 *
 *   - KEYLESS (no `invokeModel`): deterministic. Start from an empty tower and
 *     upsert the thesis VERBATIM into L1.mission and L5.value_proposition as
 *     low-confidence, user-sourced drafts. Nothing is invented — no market,
 *     category, or positioning is fabricated.
 *   - WITH `invokeModel`: ask the model for structured `{layerId,fieldKey,value}`
 *     entries, zod-parse them, and upsert each valid one with provenance "ai".
 *     Malformed model output is tolerated (safeParse + skip) — never thrown.
 *
 * Timestamps are injected via `now` so the engine stays deterministic. The model
 * port mirrors `executeStartupRun`'s `invokeModel?` injection pattern.
 */

/** Verbatim-seed fields: where the raw thesis lands on the keyless path. */
const VERBATIM_SEED_TARGETS = [
  { layerId: "L1", fieldKey: "mission" },
  { layerId: "L5", fieldKey: "value_proposition" },
] as const;

/** Confidence stamped on a verbatim, un-reasoned seed (deliberately low). */
const VERBATIM_SEED_CONFIDENCE = 0.2;

/** Confidence stamped on an AI-extracted field when the model omits one. */
const DEFAULT_AI_CONFIDENCE = 0.6;

/**
 * The model port: given a structured prompt, return the model's raw text. The
 * caller (this module) is responsible for parsing — the port itself never
 * throws on bad content; we tolerate junk at the parse step. Keyless tests pass
 * a fake; production wires a real LLM. `unknown` return-narrowing is handled by
 * the parser, so the port signature stays minimal.
 */
export type TowerCompileModelInvoker = (prompt: string) => Promise<string>;

/** Input boundary for `compileTowerFromThesis`. `projectId` + `thesis` required. */
export interface CompileTowerInput {
  readonly projectId: string;
  readonly thesis: string;
  readonly stage?: Stage;
  readonly invokeModel?: TowerCompileModelInvoker;
  /** Injected timestamp — keeps compilation deterministic and keyless-testable. */
  readonly now?: string;
  /** Storage seam; defaults to an in-memory store (swappable for Prisma later). */
  readonly repository?: CompanyContextRepository;
}

const CompileTowerInputSchema = z.object({
  projectId: z.string().min(1),
  thesis: z.string().min(1),
});

/**
 * One field entry the model is asked to return. `value` is `unknown` (validated
 * per-field downstream by the repository against the field's kind). `confidence`
 * is optional; a default is applied when the model omits it.
 */
const ModelFieldEntrySchema = z.object({
  layerId: LayerIdSchema,
  fieldKey: z.string().min(1),
  value: z.unknown(),
  confidence: z.number().min(0).max(1).optional(),
});

type ModelFieldEntry = z.infer<typeof ModelFieldEntrySchema>;

/** The structured prompt handed to the model — strict JSON-array contract. */
function buildCompilePrompt(thesis: string, stage: Stage): string {
  return JSON.stringify(
    {
      instruction:
        "You are seeding a nine-layer company-context tower from a founder thesis. " +
        "Return STRICT JSON: an array of {layerId,fieldKey,value,confidence?} entries. " +
        "layerId is one of L1..L9. fieldKey is a seed field key on that layer " +
        "(e.g. L1.mission, L2.vision, L4.positioning, L5.jtbd, L6.icp). value is the " +
        "extracted content for that field. confidence is 0..1. Do not invent facts " +
        "the thesis does not support; omit a field rather than guess. Return ONLY the array.",
      stage,
      thesis,
    },
    null,
    2,
  );
}

/**
 * Parse the model's raw text into validated field entries. Tolerant by design:
 * non-JSON, non-array, or per-entry-malformed output yields an empty list rather
 * than throwing. Bad entries inside a valid array are skipped individually.
 */
function parseModelEntries(text: string): readonly ModelFieldEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, ""),
    );
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((entry) => {
    const result = ModelFieldEntrySchema.safeParse(entry);
    return result.success ? [result.data] : [];
  });
}

/**
 * Upsert a single field, swallowing repository rejections (unknown field key,
 * locked field, etc.) so one bad model entry never aborts the whole compile.
 * Returns the latest context; on failure returns the input context unchanged.
 */
function safeUpsert(
  repository: CompanyContextRepository,
  projectId: string,
  layerId: ModelFieldEntry["layerId"],
  fieldKey: string,
  value: unknown,
  meta: { provenance: FieldProvenance; confidence: number; now: string },
  fallback: CompanyContext,
): CompanyContext {
  try {
    return repository.upsertField(projectId, layerId, fieldKey, value, {
      provenance: meta.provenance,
      confidence: meta.confidence,
      now: meta.now,
    });
  } catch {
    return fallback;
  }
}

/**
 * Compile a founder thesis into a seeded nine-layer company context.
 *
 * Keyless by default (deterministic verbatim seed). When `invokeModel` is
 * provided, additionally extracts AI-sourced fields, tolerating any malformed
 * model output. Always returns a structurally valid tower.
 */
export async function compileTowerFromThesis(input: CompileTowerInput): Promise<CompanyContext> {
  const { projectId, thesis } = CompileTowerInputSchema.parse(input);
  const stage: Stage = input.stage ?? "pre_seed";
  const now = input.now ?? new Date().toISOString();
  const repository = input.repository ?? new InMemoryCompanyContextRepository();

  // 1. Seed an empty tower and persist it so the repository can upsert against it.
  repository.save(createEmptyContext(projectId, stage, now));

  // 2. Deterministic verbatim seed — thesis into L1.mission + L5.value_proposition.
  //    No regex heuristics, no guessing market/category. Low confidence by design.
  let context = repository.get(projectId) as CompanyContext;
  for (const target of VERBATIM_SEED_TARGETS) {
    context = safeUpsert(
      repository,
      projectId,
      target.layerId,
      target.fieldKey,
      thesis,
      { provenance: "user", confidence: VERBATIM_SEED_CONFIDENCE, now },
      context,
    );
  }

  // 3. Keyless path stops here — fully deterministic, no network.
  if (input.invokeModel === undefined) {
    return context;
  }

  // 4. Model path — extract structured fields, tolerate junk, upsert as "ai".
  const raw = await input.invokeModel(buildCompilePrompt(thesis, stage));
  const entries = parseModelEntries(raw);

  for (const entry of entries) {
    context = safeUpsert(
      repository,
      projectId,
      entry.layerId,
      entry.fieldKey,
      entry.value,
      {
        provenance: "ai",
        confidence: entry.confidence ?? DEFAULT_AI_CONFIDENCE,
        now,
      },
      context,
    );
  }

  return context;
}
