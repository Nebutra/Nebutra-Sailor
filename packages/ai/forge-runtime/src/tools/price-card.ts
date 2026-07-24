/**
 * Reference LLM price card — derived from `@nebutra/ai-providers/frontier` SSOT.
 * Do not hardcode model ids or list prices here; update frontier.ts.
 */
import {
  DEFAULT_PUBLIC_MODEL,
  FRONTIER,
  type FrontierModelDef,
  findByBare,
  ROUTER_PUBLIC_MODEL_IDS,
} from "@nebutra/ai-providers/frontier";

export interface ModelPriceRow {
  readonly inputPerMTok: number;
  readonly outputPerMTok: number;
  readonly label: string;
  readonly provider: string;
}

function toPriceRow(def: FrontierModelDef): ModelPriceRow {
  return {
    inputPerMTok: def.inputPerMTok,
    outputPerMTok: def.outputPerMTok,
    label: def.label,
    provider: def.provider,
  };
}

/** Built from ROUTER_PUBLIC_MODEL_IDS — one row per bare id. */
export const REF_PRICE_CARD: Record<string, ModelPriceRow> = Object.fromEntries(
  ROUTER_PUBLIC_MODEL_IDS.map((bare: string) => {
    const def = findByBare(bare) ?? FRONTIER.default;
    return [bare, toPriceRow(def)];
  }),
);

export type PriceCardModelId = (typeof ROUTER_PUBLIC_MODEL_IDS)[number];

export const PRICE_CARD_MODEL_IDS: readonly PriceCardModelId[] = ROUTER_PUBLIC_MODEL_IDS;

export const DEFAULT_PRICE_CARD_MODEL: PriceCardModelId = (
  PRICE_CARD_MODEL_IDS.includes(DEFAULT_PUBLIC_MODEL as PriceCardModelId)
    ? DEFAULT_PUBLIC_MODEL
    : PRICE_CARD_MODEL_IDS[0]
) as PriceCardModelId;

export function getPriceRow(model: string): ModelPriceRow | undefined {
  return REF_PRICE_CARD[model];
}

export function priceCardSelectOptions(): readonly { value: string; label: string }[] {
  return PRICE_CARD_MODEL_IDS.map((id) => ({
    value: id,
    label: REF_PRICE_CARD[id]?.label ?? id,
  }));
}
