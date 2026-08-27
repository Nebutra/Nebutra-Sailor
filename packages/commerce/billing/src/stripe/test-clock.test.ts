import { describe, expect, it, vi } from "vitest";
import {
  advanceStripeTestClock,
  clockAdvanceCrossesPeriodEnd,
  createStripeTestClock,
  decideClockWebhookReplay,
  invoiceEventsAfterClockAdvance,
  isStripeTestModeSecret,
  requireStripeTestClockSecret,
  STRIPE_TEST_CLOCK_IN_FLIGHT_MS,
} from "./test-clock";

describe("Stripe Test Clock", () => {
  it("rejects live secrets", () => {
    expect(isStripeTestModeSecret("sk_test_123")).toBe(true);
    expect(isStripeTestModeSecret("sk_live_123")).toBe(false);
    expect(() => requireStripeTestClockSecret("sk_live_123")).toThrow(/sk_test_/);
  });

  it("creates and advances a clock through the Stripe testHelpers API", async () => {
    const clocks = {
      create: vi.fn().mockResolvedValue({
        id: "clock_1",
        frozen_time: 1_700_000_000,
        name: "billing-recovery",
      }),
      advance: vi.fn().mockResolvedValue({
        id: "clock_1",
        frozen_time: 1_700_086_400,
      }),
    };

    await expect(
      createStripeTestClock(clocks, { frozenTime: 1_700_000_000, name: "billing-recovery" }),
    ).resolves.toEqual({
      id: "clock_1",
      frozenTime: 1_700_000_000,
      name: "billing-recovery",
    });
    await expect(advanceStripeTestClock(clocks, "clock_1", 1_700_086_400)).resolves.toEqual({
      id: "clock_1",
      frozenTime: 1_700_086_400,
    });
  });

  it("emits invoice.paid only after the clock crosses the period end", () => {
    expect(clockAdvanceCrossesPeriodEnd(100, 199, 200)).toBe(false);
    expect(
      invoiceEventsAfterClockAdvance({
        previousFrozenTime: 100,
        nextFrozenTime: 200,
        subscriptionPeriodEnd: 200,
      }),
    ).toEqual(["invoice.finalized", "invoice.paid", "customer.subscription.updated"]);
  });

  it("replays a crashed invoice.paid and skips only after processedAt", () => {
    const createdAt = new Date("2026-08-27T00:00:00.000Z");
    const now = new Date("2026-08-27T00:00:10.000Z");

    expect(
      decideClockWebhookReplay(
        { processedAt: null, errorMessage: "handler exploded", createdAt },
        now,
      ),
    ).toBe("process");
    expect(
      decideClockWebhookReplay(
        { processedAt: new Date("2026-08-27T00:00:05.000Z"), errorMessage: null, createdAt },
        now,
      ),
    ).toBe("skip_processed");
    expect(
      decideClockWebhookReplay(
        { processedAt: null, errorMessage: null, createdAt },
        new Date(createdAt.getTime() + STRIPE_TEST_CLOCK_IN_FLIGHT_MS - 1),
      ),
    ).toBe("in_flight");
  });

  it.skipIf(!isStripeTestModeSecret(process.env.STRIPE_SECRET_KEY))(
    "creates a real Stripe test clock when sk_test_ is present",
    async () => {
      const Stripe = (await import("stripe")).default;
      const stripe = new Stripe(requireStripeTestClockSecret(), {
        apiVersion: "2026-02-25.clover",
      });
      const frozenTime = Math.floor(Date.now() / 1000);
      const clock = await createStripeTestClock(stripe.testHelpers.testClocks, {
        frozenTime,
        name: "nebutra-billing-recovery",
      });
      expect(clock.id).toMatch(/^clock_/);
      const advanced = await advanceStripeTestClock(
        stripe.testHelpers.testClocks,
        clock.id,
        frozenTime + 86_400,
      );
      expect(advanced.frozenTime).toBeGreaterThanOrEqual(frozenTime + 86_400);
      await stripe.testHelpers.testClocks.del(clock.id);
    },
  );
});
