import type { WebhookEvent } from "@nebutra/db";
import type { UpsertWebhookEventData, WebhookEventRepository } from "./webhook-event.repository";

/** Stripe/Clerk retry while another worker still holds the first attempt. */
export const WEBHOOK_IN_FLIGHT_MS = 30_000;

export type WebhookInboxDecision = "process" | "skip_processed" | "in_flight";

export type AcceptWebhookEventResult =
  | { outcome: "process"; event: WebhookEvent }
  | { outcome: "skip_processed" }
  | { outcome: "in_flight" };

/**
 * Unique `(provider, eventId)` means received, not processed.
 *
 * - `processedAt` set → safe to acknowledge as a duplicate.
 * - `errorMessage` set → previous attempt failed; retry side effects.
 * - recent create with no error → another worker is still in-flight.
 * - stale pending after a crash → retry.
 */
export function decideWebhookInbox(
  event: Pick<WebhookEvent, "processedAt" | "createdAt" | "errorMessage">,
  now = new Date(),
  inFlightMs = WEBHOOK_IN_FLIGHT_MS,
): WebhookInboxDecision {
  if (event.processedAt != null) {
    return "skip_processed";
  }
  if (event.errorMessage) {
    return "process";
  }
  const ageMs = now.getTime() - event.createdAt.getTime();
  if (ageMs < inFlightMs) {
    return "in_flight";
  }
  return "process";
}

/**
 * Claim or resume a webhook inbox row. Callers must process synchronously
 * and only acknowledge the provider after `markProcessed`.
 */
export async function acceptWebhookEvent(
  repo: WebhookEventRepository,
  data: UpsertWebhookEventData,
  now = new Date(),
): Promise<AcceptWebhookEventResult> {
  const claim = await repo.claim(data);
  if (claim.claimed) {
    return { outcome: "process", event: claim.event };
  }

  const existing = await repo.findByProviderAndEventId(data.provider, data.eventId);
  if (!existing) {
    throw new Error(
      `Webhook inbox lost the ${data.provider}/${data.eventId} row after a unique conflict`,
    );
  }

  const decision = decideWebhookInbox(existing, now);
  if (decision === "skip_processed") {
    return { outcome: "skip_processed" };
  }
  if (decision === "in_flight") {
    return { outcome: "in_flight" };
  }
  return { outcome: "process", event: existing };
}
