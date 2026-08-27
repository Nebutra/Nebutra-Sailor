import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  acceptWebhookEventMock,
  constructEventMock,
  markFailedMock,
  markProcessedMock,
  userCreateMock,
  verifyMock,
} = vi.hoisted(() => ({
  acceptWebhookEventMock: vi.fn(),
  constructEventMock: vi.fn(),
  markFailedMock: vi.fn(),
  markProcessedMock: vi.fn(),
  userCreateMock: vi.fn(),
  verifyMock: vi.fn(),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    child: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@nebutra/db", () => ({
  getSystemDb: () => ({}),
}));

vi.mock("@nebutra/billing", () => ({
  handleCreditPurchaseWebhook: vi.fn(),
}));

vi.mock("@nebutra/brand/metadata-helpers", () => ({
  getBrandOrigin: () => "https://app.example",
}));

vi.mock("@nebutra/license", () => ({
  issueLicense: vi.fn(),
}));

vi.mock("@nebutra/repositories", () => ({
  acceptWebhookEvent: (...args: unknown[]) => acceptWebhookEventMock(...args),
  OrganizationMemberRepository: class OrganizationMemberRepository {},
  OrganizationRepository: class OrganizationRepository {},
  UserRepository: class UserRepository {},
  WebhookEventRepository: class WebhookEventRepository {
    markFailed = (...args: unknown[]) => markFailedMock(...args);
    markProcessed = (...args: unknown[]) => markProcessedMock(...args);
  },
}));

vi.mock("svix", () => ({
  Webhook: class {
    verify(...args: unknown[]) {
      return verifyMock(...args);
    }
  },
}));

vi.mock("stripe", () => {
  class Stripe {
    webhooks = {
      constructEvent: (...args: unknown[]) => constructEventMock(...args),
    };
  }
  return { default: Stripe };
});

vi.mock("../inngest/client.js", () => ({
  inngest: { send: vi.fn() },
}));

import { createClerkWebhookRoutes } from "../routes/webhooks/clerk.js";
import { stripeWebhookRoutes } from "../routes/webhooks/stripe.js";

const clerkHeaders = {
  "svix-id": "msg_1",
  "svix-timestamp": "1710000000",
  "svix-signature": "v1,sig",
};

describe("webhook inbox HTTP mapping", () => {
  beforeEach(() => {
    acceptWebhookEventMock.mockReset();
    constructEventMock.mockReset();
    markFailedMock.mockReset();
    markProcessedMock.mockReset();
    userCreateMock.mockReset();
    verifyMock.mockReset();
    process.env.CLERK_WEBHOOK_SECRET = "whsec_test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_stripe";
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    markProcessedMock.mockResolvedValue({});
    markFailedMock.mockResolvedValue({});
    userCreateMock.mockResolvedValue({});
  });

  it("acks Clerk only after a processed inbox row", async () => {
    verifyMock.mockReturnValue({
      type: "user.created",
      data: {
        id: "user_1",
        email_addresses: [{ id: "email_1", email_address: "a@example.com", verification: null }],
        first_name: "A",
        last_name: "B",
        image_url: null,
        profile_image_url: null,
      },
    });
    acceptWebhookEventMock.mockResolvedValue({
      outcome: "process",
      event: { id: "row_1" },
    });

    const app = createClerkWebhookRoutes({
      userRepo: { create: userCreateMock } as never,
      webhookEventRepo: {
        markProcessed: markProcessedMock,
        markFailed: markFailedMock,
      } as never,
    });

    const response = await app.request("/clerk", {
      method: "POST",
      headers: clerkHeaders,
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(markProcessedMock).toHaveBeenCalledWith("clerk", "msg_1");
    await expect(response.json()).resolves.toEqual({ received: true });
  });

  it("returns 503 while a Clerk event is still in-flight", async () => {
    verifyMock.mockReturnValue({ type: "user.updated", data: { id: "user_1" } });
    acceptWebhookEventMock.mockResolvedValue({ outcome: "in_flight" });

    const app = createClerkWebhookRoutes({
      webhookEventRepo: {
        markProcessed: markProcessedMock,
        markFailed: markFailedMock,
      } as never,
    });

    const response = await app.request("/clerk", {
      method: "POST",
      headers: clerkHeaders,
      body: "{}",
    });

    expect(response.status).toBe(503);
    expect(markProcessedMock).not.toHaveBeenCalled();
  });

  it("returns 500 so Clerk retries after a handler failure", async () => {
    verifyMock.mockReturnValue({
      type: "user.created",
      data: {
        id: "user_1",
        email_addresses: [],
        first_name: null,
        last_name: null,
        image_url: null,
        profile_image_url: null,
      },
    });
    acceptWebhookEventMock.mockResolvedValue({
      outcome: "process",
      event: { id: "row_1" },
    });
    userCreateMock.mockRejectedValue(new Error("db down"));

    const app = createClerkWebhookRoutes({
      userRepo: { create: userCreateMock } as never,
      webhookEventRepo: {
        markProcessed: markProcessedMock,
        markFailed: markFailedMock,
      } as never,
    });

    const response = await app.request("/clerk", {
      method: "POST",
      headers: clerkHeaders,
      body: "{}",
    });

    expect(response.status).toBe(500);
    expect(markFailedMock).toHaveBeenCalledWith("clerk", "msg_1", "db down");
    expect(markProcessedMock).not.toHaveBeenCalled();
  });

  it("returns 503 while a Stripe event is still in-flight", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_1",
      type: "invoice.paid",
      data: { object: {} },
    });
    acceptWebhookEventMock.mockResolvedValue({ outcome: "in_flight" });

    const response = await stripeWebhookRoutes.request("/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=sig" },
      body: "{}",
    });

    expect(response.status).toBe(503);
    expect(markProcessedMock).not.toHaveBeenCalled();
  });

  it("acks Stripe only after the inbox row is marked processed", async () => {
    constructEventMock.mockReturnValue({
      id: "evt_1",
      type: "ping",
      data: { object: {} },
    });
    acceptWebhookEventMock.mockResolvedValue({
      outcome: "process",
      event: { id: "row_1" },
    });

    const response = await stripeWebhookRoutes.request("/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=sig" },
      body: "{}",
    });

    expect(response.status).toBe(200);
    expect(markProcessedMock).toHaveBeenCalledWith("stripe", "evt_1");
  });
});
