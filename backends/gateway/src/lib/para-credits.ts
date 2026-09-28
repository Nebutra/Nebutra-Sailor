/**
 * What a PARA generation costs, and the charge / refund around it.
 *
 * The charge is taken before the origin admits the task, as Lovart's generator does (deducted at
 * submit, research/competitors/lovart/business/jobs.md). Charging on success would depend on the
 * browser watching the job — a client that stops polling would never pay — so the credits leave
 * first and come back if the task fails or is cancelled.
 *
 * Both legs are idempotent through the ledger itself: `credit_transactions` is unique on
 * (balance, type, related_id), and the related id is the charge key. A retried submit cannot
 * charge twice, and two pollers that both see a failed job cannot refund twice — the second
 * insert violates the constraint and its transaction rolls back.
 *
 * Price (defaults in @nebutra/billing/prices): Para credits sell at 1,000 for USD 9.99
 * (ops/nebutra/offers.json), so a credit is about one cent: an image is 10 credits (USD 0.10), a
 * text turn 1, video per second per model (Wan 2.7 at 720P: 13/s). Competitors price one image per
 * model — Lovart 1–15 credits, Seko 1–7 (research/competitors/{lovart/business/generation,
 * seko/business/jobs}.md) — on credits of their own value, so the number is ours, not copied.
 * Every mode is overridable per deployment without a code change.
 */

import { deductCredits, refundCredits } from "@nebutra/billing";
import {
  PARA_CREDITS_PER_OUTPUT,
  type ParaVideoQuote,
  paraVideoQuote,
} from "@nebutra/billing/prices";
import type { ParaGeneratorInput } from "./para-origin.js";

export const PARA_WALLET_PRODUCT = "para" as const;

// The defaults the canvas quotes from too (@nebutra/billing/prices), so "✦10" before Generate and
// the 10 taken after it are one number. The env overrides below are server-only by design.
const DEFAULT_CREDITS: Readonly<Record<ParaGeneratorInput["mode"], number>> =
  PARA_CREDITS_PER_OUTPUT;

// For video the override is credits per SECOND, applied to every video model.
const ENV_KEYS: Record<ParaGeneratorInput["mode"], string> = {
  image: "PARA_CREDITS_PER_IMAGE",
  text: "PARA_CREDITS_PER_TEXT",
  video: "PARA_CREDITS_PER_VIDEO",
  audio: "PARA_CREDITS_PER_AUDIO",
};

function envOverride(mode: ParaGeneratorInput["mode"]): number | null {
  const raw = process.env[ENV_KEYS[mode]];
  const parsed = raw === undefined || raw === "" ? Number.NaN : Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Credits per output for image / text / audio; for video, one default clip (see below). */
export function creditsPerUnit(mode: ParaGeneratorInput["mode"]): number {
  if (mode === "video") {
    const quote = paraVideoQuote();
    return quote ? videoRate(quote) * quote.durationSeconds : DEFAULT_CREDITS.video;
  }
  return envOverride(mode) ?? DEFAULT_CREDITS[mode];
}

function videoRate(quote: ParaVideoQuote): number {
  return envOverride("video") ?? quote.creditsPerSecond;
}

/** The generator's video quote, or null when the model cannot be run (planned, unknown). */
export function videoQuoteFor(
  generator: Pick<ParaGeneratorInput, "model" | "params">,
): ParaVideoQuote | null {
  return paraVideoQuote({
    model: generator.model,
    durationSeconds: generator.params?.duration,
    resolution: generator.params?.resolution,
  });
}

/** A video job for a model that is planned or unknown: refused before any charge. */
export class ModelUnavailableError extends Error {
  readonly code = "model_unavailable";
  constructor(public readonly model: string | undefined) {
    super(`Video model '${model ?? "Auto"}' is not available`);
    this.name = "ModelUnavailableError";
  }
}

/**
 * Credits one job costs: per unit, times the number of outputs asked for. Video is credits per
 * second of the resolved model × the duration it will actually run (snapped to what the model
 * accepts, the same rule the origin applies) × outputs. Throws ModelUnavailableError for a video
 * model that cannot run — never a price for work that will not happen.
 */
export function paraJobCost(
  generator: Pick<ParaGeneratorInput, "mode" | "count" | "model" | "params">,
): number {
  const count = generator.count ?? 1;
  if (generator.mode !== "video") return creditsPerUnit(generator.mode) * count;
  const quote = videoQuoteFor(generator);
  if (!quote) throw new ModelUnavailableError(generator.model);
  return videoRate(quote) * quote.durationSeconds * count;
}

/** Recorded on the task so a later reader can refund exactly what was taken. */
export interface ParaCharge {
  key: string;
  credits: number;
}

function relatedId(key: string): string {
  return `para-job:${key}`;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Take the credits for a job. Throws the billing error (402 INSUFFICIENT_CREDITS) when the
 * balance is short. A repeat of the same key is treated as already paid.
 */
export async function chargeParaJob(organizationId: string, charge: ParaCharge): Promise<void> {
  if (charge.credits <= 0) return;
  try {
    await deductCredits({
      organizationId,
      product: PARA_WALLET_PRODUCT,
      amount: charge.credits,
      description: "PARA generation",
      relatedId: relatedId(charge.key),
      metadata: { chargeKey: charge.key },
    });
  } catch (error) {
    if (isUniqueViolation(error)) return;
    throw error;
  }
}

/** Give a job's credits back. Safe to call from every path that sees the failure. */
export async function refundParaJob(organizationId: string, charge: ParaCharge): Promise<void> {
  if (charge.credits <= 0) return;
  try {
    await refundCredits({
      organizationId,
      product: PARA_WALLET_PRODUCT,
      amount: charge.credits,
      reason: "PARA generation did not complete",
      relatedId: relatedId(charge.key),
    });
  } catch (error) {
    if (isUniqueViolation(error)) return;
    throw error;
  }
}

/** The charge a task carries in its metadata, if any. */
export function chargeOf(task: Record<string, unknown>): ParaCharge | null {
  const metadata = task.metadata as Record<string, unknown> | undefined;
  const charge = metadata?.charge as Record<string, unknown> | undefined;
  if (!charge) return null;
  const key = typeof charge.key === "string" ? charge.key : null;
  const credits = typeof charge.credits === "number" ? charge.credits : null;
  return key && credits !== null ? { key, credits } : null;
}

/** Terminal states whose credits go back: the origin's `failed` and `cancelled`. */
export function isRefundable(task: Record<string, unknown>): boolean {
  const status = String(task.status ?? "");
  return status === "failed" || status === "cancelled";
}
