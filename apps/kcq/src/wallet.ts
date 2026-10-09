/**
 * The KCQ wallet as the shell sees it: a balance for the active workspace, a few
 * recent calls, and the one way to fund it. Funding is a payment, and payments
 * happen on the shared checkout page (ADR 2026-09-27 product wallets): this file
 * only names the offer and where to come back to. Nothing here charges anything.
 */
import { checkoutLink } from "@nebutra/billing/links";
import { brand } from "@nebutra/brand/metadata";

/** The offer that funds the KCQ wallet (ops/nebutra/offers.json). */
export const KCQ_TOPUP_OFFER_ID = "kcq_topup";
/** The catalog's USD floor for `kcq_topup`; checkout enforces it again. */
export const KCQ_MIN_TOP_UP = 5;
export const KCQ_TOP_UP_PRESETS = [10, 25, 50] as const;

export interface WalletUsageRow {
  id: string;
  occurredAt: string;
  model: string | null;
  cost: number;
  currency: string;
}

export type WalletState =
  | { status: "loading" }
  | { status: "error" }
  /** Platform staff ride the internal source and are never billed. */
  | { status: "internal" }
  | { status: "ready"; balance: number; currency: string; usage: WalletUsageRow[] };

function field(value: unknown, key: string): unknown {
  return value && typeof value === "object"
    ? Object.getOwnPropertyDescriptor(value, key)?.value
    : undefined;
}

/** Decode the gateway's wallet envelope; anything unexpected is an error, never a zero balance. */
export function parseWallet(data: unknown): WalletState {
  if (field(data, "internal") === true) return { status: "internal" };
  const balance = field(data, "balance");
  const currency = field(data, "currency");
  if (typeof balance !== "number" || !Number.isFinite(balance) || typeof currency !== "string") {
    return { status: "error" };
  }
  const rows = field(data, "usage");
  const usage = Array.isArray(rows)
    ? rows.flatMap((row: unknown): WalletUsageRow[] => {
        const id = field(row, "id");
        const occurredAt = field(row, "occurredAt");
        const model = field(row, "model");
        const cost = field(row, "cost");
        const rowCurrency = field(row, "currency");
        if (typeof id !== "string" || typeof occurredAt !== "string" || typeof cost !== "number") {
          return [];
        }
        return [
          {
            id,
            occurredAt,
            model: typeof model === "string" ? model : null,
            cost,
            currency: typeof rowCurrency === "string" ? rowCurrency : currency,
          },
        ];
      })
    : [];
  return { status: "ready", balance, currency, usage };
}

/** Where to pay: the shared checkout, back to this page once the balance is credited. */
export function topUpUrl(origin: string, amount?: number): string {
  return checkoutLink({
    checkoutUrl: `https://${brand.domains.app}/checkout`,
    offerId: KCQ_TOPUP_OFFER_ID,
    returnTo: `${origin.replace(/\/+$/, "")}/`,
    ...(amount === undefined ? {} : { amount, currency: "USD" as const }),
  });
}

/** Same precision rule as the Router wallet: small per-call charges keep their digits. */
export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  const magnitude = Math.abs(amount);
  if (magnitude === 0) return "0.00";
  if (magnitude < 0.01) return amount.toFixed(6);
  if (magnitude < 1) return amount.toFixed(4);
  return amount.toFixed(2);
}

export function formatBalance(balance: number, currency: string): string {
  return `${currency === "USD" ? "$" : ""}${formatAmount(balance)}${currency === "USD" ? "" : ` ${currency}`}`;
}

/** Whether the wallet can no longer pay for a typical call; used to tint the chip. */
export function isLow(state: WalletState): boolean {
  return state.status === "ready" && state.balance < KCQ_MIN_TOP_UP / 10;
}
