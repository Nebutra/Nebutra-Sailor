import type { CompanyContext, LayerId } from "./model";

/**
 * Tower -> flat projection. The nine-layer tower is the source of truth; a few
 * consumers (the generated scaffold, the preview-HTML regex, LLM prompts, and
 * dashboard/cofounder cards) only need a flat `{ name, promise, ... }` view.
 * These pure read helpers derive that view on demand — they never mutate, never
 * reach the network, and import cleanly in both server and client components.
 *
 * Defaults are surfaced for the two most-read fields so callers never get an
 * empty company name or promise; every other field projects to "" / [] when
 * absent so the legacy flat shape stays total.
 */

const DEFAULT_NAME = "Nebutra Venture";
const DEFAULT_PROMISE = "A company workspace compiled from the submitted proposition.";

function rawValue(ctx: CompanyContext, layerId: LayerId, fieldKey: string): unknown {
  return ctx.layers[layerId]?.values[fieldKey]?.value;
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function asStringList(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/** Company name — L8 identity. Falls back to a non-empty default. */
export function companyName(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L8", "name")) ?? DEFAULT_NAME;
}

/** The one-line promise — L5 product value proposition. Non-empty default. */
export function valueProposition(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L5", "value_proposition")) ?? DEFAULT_PROMISE;
}

/** Category — L4 strategy. */
export function companyCategory(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L4", "category")) ?? "";
}

/** Served market — L6 users. */
export function companyMarket(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L6", "market")) ?? "";
}

/** Moat — L4 strategy. */
export function companyMoat(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L4", "moat")) ?? "";
}

/** Core bet / belief — L1 essence. */
export function companyCoreBet(ctx: CompanyContext): string {
  return asText(rawValue(ctx, "L1", "why")) ?? "";
}

/** Operating principles — L3 principles, as a string list. */
export function operatingPrinciples(ctx: CompanyContext): readonly string[] {
  return asStringList(rawValue(ctx, "L3", "operating_principles"));
}

/**
 * The legacy flat CompanyContext shape, derived from the tower. Consumed by the
 * generated `src/lib/company-context.ts`, the preview regex, and the LLM prompts
 * (compact + stable serialization).
 */
export interface FlatCompanyView {
  readonly name: string;
  readonly promise: string;
  readonly category: string;
  readonly market: string;
  readonly moat: string;
  readonly coreBet: string;
  readonly operatingModel: readonly string[];
}

export function flatCompanyView(ctx: CompanyContext): FlatCompanyView {
  return {
    name: companyName(ctx),
    promise: valueProposition(ctx),
    category: companyCategory(ctx),
    market: companyMarket(ctx),
    moat: companyMoat(ctx),
    coreBet: companyCoreBet(ctx),
    operatingModel: operatingPrinciples(ctx),
  };
}
