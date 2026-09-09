/**
 * The one price resolver.
 *
 * Every charge the Router writes — the reservation, the ledger row, the console
 * readout — comes from `priceUsage`. No price string is computed anywhere else.
 *
 * It is deliberately pure: the caller loads the `ModelPriceRow` (from
 * `model_configs`) and passes it in. That keeps this file free of Prisma, makes
 * every unit unit-testable, and makes it impossible for a second, divergent
 * pricing path to grow next to a DB query.
 *
 * Money is USD. A per-request cost carries 6 decimal places, matching
 * `UsageLedgerEntry.totalCost` / `Decimal(10,6)`.
 */

/** Mirrors the Prisma `PriceUnit` enum; duplicated as a string union so this package stays Prisma-free. */
export type PriceUnit =
  | "PER_1M_TOKENS"
  | "PER_CALL"
  | "PER_SECOND"
  | "PER_IMAGE"
  | "PER_1M_CHARS"
  | "PER_MINUTE"
  | "PER_PAGE"
  | "FREE"
  | "PASS_THROUGH";

/** A row of `model_configs`, already converted from Prisma Decimal to number. */
export interface ModelPriceRow {
  readonly modelName: string;
  readonly unit: PriceUnit;
  readonly currency?: string | null;
  readonly published?: boolean;
  /** Token units — price per 1,000,000 tokens. */
  readonly inputPerMTok?: number | null;
  readonly outputPerMTok?: number | null;
  readonly cacheReadPerMTok?: number | null;
  readonly cacheWritePerMTok?: number | null;
  /** Non-token units — price for one call / image / second / minute / page, or per 1M chars. */
  readonly unitPrice?: number | null;
}

/** What the request actually consumed. Every field is optional; absent means zero. */
export interface UsageCounts {
  readonly promptTokens?: number;
  readonly completionTokens?: number;
  /** Prompt tokens served from the upstream cache — billed at the cache-read price. */
  readonly cachedPromptTokens?: number;
  /** Tokens written into the upstream cache — billed at the cache-write price. */
  readonly cacheWriteTokens?: number;
  readonly calls?: number;
  readonly images?: number;
  readonly seconds?: number;
  readonly minutes?: number;
  readonly pages?: number;
  readonly chars?: number;
}

export interface PriceComponent {
  /** `input` | `output` | `cache_read` | `cache_write` | `call` | `image` | … */
  readonly kind: string;
  readonly quantity: number;
  /** Price of one unit of `quantity` (per token, per call, per second, …). */
  readonly rate: number;
  readonly cost: number;
}

export type UnpricedReason =
  /** No row at all — the model is not in the price service. */
  | "unknown_model"
  /** A row exists but the price this unit needs is null. */
  | "missing_price"
  /** The upstream bills us and we pass its number through; the caller must supply it. */
  | "pass_through";

export type PriceResult =
  | {
      readonly ok: true;
      readonly model: string;
      readonly unit: PriceUnit;
      /** Billable quantity in the row's unit (tokens, calls, images, seconds, …). */
      readonly quantity: number;
      /** `totalCost / quantity`, 6 dp. Zero-quantity requests report 0. */
      readonly unitCost: number;
      readonly totalCost: number;
      readonly currency: "USD";
      readonly components: readonly PriceComponent[];
    }
  | {
      readonly ok: false;
      readonly model: string;
      readonly reason: UnpricedReason;
      readonly currency: "USD";
    };

const MONEY_DP = 6;
const PER_MILLION = 1_000_000;

/** 6 dp is the ledger's precision (`Decimal(10,6)`); round once, at the end of each component. */
function round6(n: number): number {
  return Math.round((n + Number.EPSILON) * 10 ** MONEY_DP) / 10 ** MONEY_DP;
}

function n(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function rate(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function unpriced(model: string, reason: UnpricedReason): PriceResult {
  return { ok: false, model, reason, currency: "USD" };
}

function settle(
  model: string,
  unit: PriceUnit,
  quantity: number,
  components: PriceComponent[],
): PriceResult {
  const totalCost = round6(components.reduce((sum, c) => sum + c.cost, 0));
  return {
    ok: true,
    model,
    unit,
    quantity,
    unitCost: quantity > 0 ? round6(totalCost / quantity) : 0,
    totalCost,
    currency: "USD",
    components,
  };
}

function component(kind: string, quantity: number, unitRate: number): PriceComponent {
  return { kind, quantity, rate: unitRate, cost: round6(quantity * unitRate) };
}

/**
 * Price one request.
 *
 * An unpriced model is **not** free. It returns `{ ok: false }` so the edge can
 * refuse it (a silent 0 would let an unpriced model be relayed for nothing,
 * which is exactly the leak the price service exists to close).
 */
export function priceUsage(
  model: string,
  usage: UsageCounts,
  priceRow: ModelPriceRow | null | undefined,
): PriceResult {
  if (!priceRow) return unpriced(model, "unknown_model");

  switch (priceRow.unit) {
    case "FREE":
      return settle(model, "FREE", flatQuantity(usage), []);

    case "PASS_THROUGH":
      return unpriced(model, "pass_through");

    case "PER_1M_TOKENS": {
      const inRate = rate(priceRow.inputPerMTok);
      const outRate = rate(priceRow.outputPerMTok);
      if (inRate === null || outRate === null) return unpriced(model, "missing_price");

      // Cached prompt tokens are billed at the cache-read price when one is
      // configured, and at the plain input price when it is not — never twice.
      const cached = n(usage.cachedPromptTokens);
      const prompt = Math.max(0, n(usage.promptTokens) - cached);
      const completion = n(usage.completionTokens);
      const cacheWrite = n(usage.cacheWriteTokens);

      const cacheReadRate = rate(priceRow.cacheReadPerMTok) ?? inRate;
      const cacheWriteRate = rate(priceRow.cacheWritePerMTok) ?? inRate;

      const components: PriceComponent[] = [
        component("input", prompt, inRate / PER_MILLION),
        component("output", completion, outRate / PER_MILLION),
      ];
      if (cached > 0) {
        components.push(component("cache_read", cached, cacheReadRate / PER_MILLION));
      }
      if (cacheWrite > 0) {
        components.push(component("cache_write", cacheWrite, cacheWriteRate / PER_MILLION));
      }

      const quantity = prompt + completion + cached + cacheWrite;
      return settle(model, "PER_1M_TOKENS", quantity, components);
    }

    case "PER_1M_CHARS": {
      const unitRate = rate(priceRow.unitPrice);
      if (unitRate === null) return unpriced(model, "missing_price");
      const chars = n(usage.chars);
      return settle(model, "PER_1M_CHARS", chars, [
        component("chars", chars, unitRate / PER_MILLION),
      ]);
    }

    case "PER_CALL":
      return simple(model, priceRow, "PER_CALL", "call", n(usage.calls) || 1);

    case "PER_IMAGE":
      return simple(model, priceRow, "PER_IMAGE", "image", n(usage.images));

    case "PER_SECOND":
      return simple(model, priceRow, "PER_SECOND", "second", n(usage.seconds));

    case "PER_MINUTE":
      return simple(model, priceRow, "PER_MINUTE", "minute", n(usage.minutes));

    case "PER_PAGE":
      return simple(model, priceRow, "PER_PAGE", "page", n(usage.pages));

    default:
      return unpriced(model, "missing_price");
  }
}

function simple(
  model: string,
  priceRow: ModelPriceRow,
  unit: PriceUnit,
  kind: string,
  quantity: number,
): PriceResult {
  const unitRate = rate(priceRow.unitPrice);
  if (unitRate === null) return unpriced(model, "missing_price");
  return settle(model, unit, quantity, [component(kind, quantity, unitRate)]);
}

/** Billable quantity for a free model — reported for the ledger, charged at 0. */
function flatQuantity(usage: UsageCounts): number {
  return (
    n(usage.promptTokens) +
    n(usage.completionTokens) +
    n(usage.cacheWriteTokens) +
    n(usage.calls) +
    n(usage.images) +
    n(usage.seconds) +
    n(usage.minutes) +
    n(usage.pages) +
    n(usage.chars)
  );
}

/**
 * Worst-case charge to reserve before the upstream call, when only the prompt
 * size and a max-output ceiling are known. Same resolver, hypothetical usage.
 */
export function reserveWorstCase(
  model: string,
  input: { promptTokens?: number; maxOutputTokens?: number; calls?: number },
  priceRow: ModelPriceRow | null | undefined,
): PriceResult {
  return priceUsage(
    model,
    {
      promptTokens: input.promptTokens ?? 0,
      completionTokens: input.maxOutputTokens ?? 0,
      calls: input.calls ?? 1,
      images: 1,
      seconds: 0,
      minutes: 0,
      pages: 1,
      chars: 0,
    },
    priceRow,
  );
}
