import { runWithFallback } from "@nebutra/agents";
import { generateText as generateAIText } from "ai";
import type { CompanyContext, FieldKind, LayerId } from "./model";
import { flatCompanyView } from "./projection";
import { getLayerMeta, getSeedFields } from "./registry";

/**
 * AI-fill one Company Context field. Keyless-testable: the model is an injected
 * `invokeModel(prompt) -> text` port (mirrors execution.ts's invokeModel). With
 * no injected model, generateField returns null (nothing generated) — callers
 * only reach the real provider after a key check. The default real invoker
 * (`invokeGenerateModel`) wraps the @nebutra/agents fallback chain.
 */

export type GenerateFieldModelInvoker = (prompt: string) => Promise<string>;

const GENERATE_SYSTEM =
  "You are Nebutra Startup Agent OS filling ONE field of a company's nine-layer context. Given the company so far and the target field, return ONLY the field value — concise, founder-grade, no preamble, no markdown fences. For a list field return a JSON array of strings; for a structured field return a JSON object; otherwise return a single line or short paragraph of plain text.";

function fieldKindOf(layerId: LayerId, fieldKey: string): FieldKind {
  return getSeedFields(layerId).find((field) => field.key === fieldKey)?.kind ?? "text";
}

/** Build the per-field fill prompt from the company context + field metadata. */
function buildGeneratePrompt(context: CompanyContext, layerId: LayerId, fieldKey: string): string {
  const meta = getLayerMeta(layerId);
  const definition = getSeedFields(layerId).find((field) => field.key === fieldKey);
  return JSON.stringify(
    {
      company: flatCompanyView(context),
      layer: { id: layerId, name: meta.key, question: meta.q },
      field: {
        key: fieldKey,
        label: definition?.label ?? fieldKey,
        kind: definition?.kind ?? "text",
      },
      instruction: `Fill the "${definition?.label ?? fieldKey}" field for the "${meta.key}" layer (${meta.q}).`,
    },
    null,
    2,
  );
}

/** Parse the model's text into a stored value by the field kind. */
function parseGenerated(text: string, kind: FieldKind): unknown {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (kind === "list" || kind === "structured") {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fall through to plain text for a non-JSON response.
    }
  }
  return trimmed;
}

export interface GenerateFieldInput {
  readonly context: CompanyContext;
  readonly layerId: LayerId;
  readonly fieldKey: string;
  readonly invokeModel?: GenerateFieldModelInvoker;
}

export async function generateField(input: GenerateFieldInput): Promise<unknown | null> {
  const { context, layerId, fieldKey, invokeModel } = input;
  if (invokeModel === undefined) return null;

  const kind = fieldKindOf(layerId, fieldKey);
  const text = await invokeModel(buildGeneratePrompt(context, layerId, fieldKey));
  const value = parseGenerated(text, kind);
  if (value === "" || value === undefined || value === null) return null;
  return value;
}

/** Default real invoker — the @nebutra/agents fallback chain (needs a key). */
export const invokeGenerateModel: GenerateFieldModelInvoker = async (prompt) => {
  const { result } = await runWithFallback(
    async (model) =>
      generateAIText({
        model,
        system: GENERATE_SYSTEM,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        maxOutputTokens: 600,
      }),
    { model: "fast" },
  );
  return result.text;
};
