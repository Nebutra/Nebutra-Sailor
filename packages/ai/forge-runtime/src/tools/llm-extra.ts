/**
 * LLM blades — cost estimate (frontier price card) + JSON Schema (Ajv).
 */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { getEncoding, type TiktokenEncoding } from "js-tiktoken";
import { z } from "zod";
import type { AnyForgeToolDefinition } from "../types";
import {
  DEFAULT_PRICE_CARD_MODEL,
  getPriceRow,
  PRICE_CARD_MODEL_IDS,
  type PriceCardModelId,
} from "./price-card";

export {
  DEFAULT_PRICE_CARD_MODEL,
  getPriceRow,
  PRICE_CARD_MODEL_IDS,
  type PriceCardModelId,
  priceCardSelectOptions,
  REF_PRICE_CARD,
} from "./price-card";

function tool(
  def: Omit<AnyForgeToolDefinition, "unitCost"> & { unitCost?: number },
): AnyForgeToolDefinition {
  return { unitCost: 0, ...def } as AnyForgeToolDefinition;
}

const modelEnum = z.enum(
  PRICE_CARD_MODEL_IDS as unknown as [PriceCardModelId, ...PriceCardModelId[]],
);

export const costEstimateTool = tool({
  id: "llm/cost-estimate",
  slug: "cost-estimate",
  category: "llm",
  title: { zh: "调用费用估算", en: "LLM Cost Estimate" },
  description: {
    zh: "按 Router 对齐的前沿模型参考价卡估算 token 费用（可换实时价）",
    en: "Estimate token cost from Router-aligned frontier price card",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.llm.cost_estimate",
  engine: {
    name: "price-card+js-tiktoken",
    upstream: "Router public model ids + published list-price ballparks",
    version: "0.2.0",
  },
  seoKeywords: { zh: "llm费用估算,token成本计算", en: "llm cost calculator token price" },
  sotaStatus: "production",
  inputSchema: z.object({
    text: z.string().optional(),
    inputTokens: z.number().int().min(0).optional(),
    outputTokens: z.number().int().min(0).default(0),
    model: modelEnum.default(DEFAULT_PRICE_CARD_MODEL),
    encoding: z.enum(["o200k_base", "cl100k_base"]).default("o200k_base"),
  }),
  execute: (input: {
    text?: string;
    inputTokens?: number;
    outputTokens?: number;
    model?: PriceCardModelId;
    encoding?: TiktokenEncoding;
  }) => {
    const model = input.model ?? DEFAULT_PRICE_CARD_MODEL;
    const card = getPriceRow(model);
    if (!card) {
      throw new Error(
        `Unknown or retired model: ${model}. Use one of: ${PRICE_CARD_MODEL_IDS.join(", ")}`,
      );
    }
    let inputTokens = input.inputTokens;
    if (inputTokens === undefined) {
      if (!input.text) throw new Error("Provide text or inputTokens");
      const enc = getEncoding(input.encoding ?? "o200k_base");
      inputTokens = enc.encode(input.text).length;
    }
    const outputTokens = input.outputTokens ?? 0;
    const inputUsd = (inputTokens / 1_000_000) * card.inputPerMTok;
    const outputUsd = (outputTokens / 1_000_000) * card.outputPerMTok;
    return {
      model,
      label: card.label,
      provider: card.provider,
      inputTokens,
      outputTokens,
      inputUsd: Number(inputUsd.toFixed(6)),
      outputUsd: Number(outputUsd.toFixed(6)),
      totalUsd: Number((inputUsd + outputUsd).toFixed(6)),
      priceCard: {
        inputPerMTok: card.inputPerMTok,
        outputPerMTok: card.outputPerMTok,
      },
      note: "List-price ballpark only — wire Router live card for production billing. Model ids match Router public catalog (not gpt-4o / retired lines).",
      engine: "price-card+js-tiktoken",
    };
  },
});

export const jsonSchemaValidateTool = tool({
  id: "llm/json-schema-validate",
  slug: "json-schema-validate",
  category: "llm",
  title: { zh: "JSON Schema 校验", en: "JSON Schema Validate" },
  description: {
    zh: "Ajv 校验 JSON 是否符合 Schema",
    en: "Validate JSON against JSON Schema via Ajv",
  },
  tier: "core",
  sideEffect: "pure",
  runtime: ["server"],
  meterId: "forge.llm.json_schema_validate",
  engine: { name: "ajv", upstream: "https://github.com/ajv-validator/ajv", version: "8.x" },
  seoKeywords: { zh: "json schema校验,ajv在线", en: "json schema validator online" },
  sotaStatus: "production",
  inputSchema: z.object({
    data: z.string(),
    schema: z.string(),
  }),
  execute: (input: { data: string; schema: string }) => {
    const data: unknown = JSON.parse(input.data);
    const schema: object = JSON.parse(input.schema) as object;
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(data);
    return {
      valid: Boolean(valid),
      errors: validate.errors ?? null,
      engine: "ajv",
    };
  },
});

export const llmExtraTools: readonly AnyForgeToolDefinition[] = [
  costEstimateTool,
  jsonSchemaValidateTool,
];
