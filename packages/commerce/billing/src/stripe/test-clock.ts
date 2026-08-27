/**
 * Stripe Test Clock helpers.
 *
 * Live calls only run against `sk_test_` keys. Production secrets must never
 * create or advance clocks.
 */

export const STRIPE_TEST_CLOCK_IN_FLIGHT_MS = 30_000;

export interface StripeTestClock {
  id: string;
  frozenTime: number;
  name?: string;
}

export interface StripeTestClockApi {
  create(params: { frozen_time: number; name?: string }): Promise<{
    id: string;
    frozen_time: number;
    name?: string | null;
  }>;
  advance(
    id: string,
    params: { frozen_time: number },
  ): Promise<{ id: string; frozen_time: number }>;
}

export interface ClockWebhookInboxState {
  processedAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

export function isStripeTestModeSecret(secret: string | undefined): boolean {
  return typeof secret === "string" && secret.startsWith("sk_test_");
}

export function requireStripeTestClockSecret(secret = process.env.STRIPE_SECRET_KEY): string {
  if (!isStripeTestModeSecret(secret)) {
    throw new Error("Stripe Test Clock requires STRIPE_SECRET_KEY starting with sk_test_");
  }
  return secret;
}

export function clockAdvanceCrossesPeriodEnd(
  previousFrozenTime: number,
  nextFrozenTime: number,
  subscriptionPeriodEnd: number,
): boolean {
  return previousFrozenTime < subscriptionPeriodEnd && nextFrozenTime >= subscriptionPeriodEnd;
}

export function invoiceEventsAfterClockAdvance(input: {
  previousFrozenTime: number;
  nextFrozenTime: number;
  subscriptionPeriodEnd: number;
}): readonly string[] {
  if (
    !clockAdvanceCrossesPeriodEnd(
      input.previousFrozenTime,
      input.nextFrozenTime,
      input.subscriptionPeriodEnd,
    )
  ) {
    return [];
  }
  return ["invoice.finalized", "invoice.paid", "customer.subscription.updated"];
}

/**
 * Inbox recovery after a clock-driven webhook crashes mid-handler.
 * Unique `(provider, eventId)` means received, not processed.
 */
export function decideClockWebhookReplay(
  event: ClockWebhookInboxState,
  now = new Date(),
  inFlightMs = STRIPE_TEST_CLOCK_IN_FLIGHT_MS,
): "process" | "skip_processed" | "in_flight" {
  if (event.processedAt != null) {
    return "skip_processed";
  }
  if (event.errorMessage) {
    return "process";
  }
  if (now.getTime() - event.createdAt.getTime() < inFlightMs) {
    return "in_flight";
  }
  return "process";
}

export async function createStripeTestClock(
  clocks: StripeTestClockApi,
  input: { frozenTime: number; name?: string },
): Promise<StripeTestClock> {
  const clock = await clocks.create({
    frozen_time: input.frozenTime,
    name: input.name,
  });
  return { id: clock.id, frozenTime: clock.frozen_time, name: clock.name ?? input.name };
}

export async function advanceStripeTestClock(
  clocks: StripeTestClockApi,
  clockId: string,
  frozenTime: number,
): Promise<StripeTestClock> {
  const clock = await clocks.advance(clockId, { frozen_time: frozenTime });
  return { id: clock.id, frozenTime: clock.frozen_time };
}
