import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the credits module BEFORE importing the handler under test
vi.mock("../../credits/index.js", () => ({
  addCredits: vi.fn(),
}));

import { addCredits } from "../../credits/index";
import { handleCreditPurchaseWebhook } from "../credit-webhook";
import { CREDIT_PURCHASE_METADATA_TYPE } from "../types";

const mockedAddCredits = vi.mocked(addCredits);

describe("handleCreditPurchaseWebhook", () => {
  beforeEach(() => {
    mockedAddCredits.mockReset();
  });

  it("returns { handled: false, skipped: 'not_credit_purchase' } when metadata.type is missing", async () => {
    const result = await handleCreditPurchaseWebhook({
      provider: "stripe",
      sessionId: "sess_123",
      metadata: {},
    });

    expect(result).toEqual({ handled: false, skipped: "not_credit_purchase" });
    expect(mockedAddCredits).not.toHaveBeenCalled();
  });

  it("returns { handled: false, skipped: 'not_credit_purchase' } when metadata.type is different", async () => {
    const result = await handleCreditPurchaseWebhook({
      provider: "stripe",
      sessionId: "sess_123",
      metadata: { type: "subscription" },
    });

    expect(result).toEqual({ handled: false, skipped: "not_credit_purchase" });
    expect(mockedAddCredits).not.toHaveBeenCalled();
  });

  it("returns { handled: true, skipped: 'invalid_metadata' } when organizationId is missing", async () => {
    const result = await handleCreditPurchaseWebhook({
      provider: "stripe",
      sessionId: "sess_123",
      metadata: {
        type: CREDIT_PURCHASE_METADATA_TYPE,
        creditAmount: "500",
      },
    });

    expect(result).toEqual({ handled: true, skipped: "invalid_metadata" });
    expect(mockedAddCredits).not.toHaveBeenCalled();
  });

  it("returns { handled: true, skipped: 'invalid_metadata' } when creditAmount is missing", async () => {
    const result = await handleCreditPurchaseWebhook({
      provider: "stripe",
      sessionId: "sess_123",
      metadata: {
        type: CREDIT_PURCHASE_METADATA_TYPE,
        organizationId: "org_123",
      },
    });

    expect(result).toEqual({ handled: true, skipped: "invalid_metadata" });
    expect(mockedAddCredits).not.toHaveBeenCalled();
  });

  it("returns { handled: true, skipped: 'invalid_metadata' } when creditAmount cannot be parsed as int", async () => {
    const result = await handleCreditPurchaseWebhook({
      provider: "stripe",
      sessionId: "sess_123",
      metadata: {
        type: CREDIT_PURCHASE_METADATA_TYPE,
        organizationId: "org_123",
        creditAmount: "not-a-number",
      },
    });

    expect(result).toEqual({ handled: true, skipped: "invalid_metadata" });
    expect(mockedAddCredits).not.toHaveBeenCalled();
  });

  it("returns { handled: true, skipped: 'invalid_metadata' } when creditAmount parses to zero or negative", async () => {
    const result = await handleCreditPurchaseWebhook({
      provider: "stripe",
      sessionId: "sess_123",
      metadata: {
        type: CREDIT_PURCHASE_METADATA_TYPE,
        organizationId: "org_123",
        creditAmount: "0",
      },
    });

    expect(result).toEqual({ handled: true, skipped: "invalid_metadata" });
    expect(mockedAddCredits).not.toHaveBeenCalled();
  });

  it("calls addCredits with correct args when metadata is valid", async () => {
    mockedAddCredits.mockResolvedValueOnce({
      id: "tx_abc",
      organizationId: "org_123",
      type: "PURCHASE",
      amount: 500,
      balanceAfter: 500,
      createdAt: new Date(),
    });

    await handleCreditPurchaseWebhook({
      provider: "stripe",
      sessionId: "sess_abc",
      metadata: {
        type: CREDIT_PURCHASE_METADATA_TYPE,
        organizationId: "org_123",
        creditAmount: "500",
        referenceId: "ref_xyz",
      },
      amountPaid: 4.99,
      currency: "USD",
    });

    expect(mockedAddCredits).toHaveBeenCalledTimes(1);
    const callArg = mockedAddCredits.mock.calls[0]?.[0];
    expect(callArg).toMatchObject({
      organizationId: "org_123",
      amount: 500,
      type: "PURCHASE",
      relatedId: "sess_abc",
    });
    expect(callArg?.description).toBeTruthy();
    expect(callArg?.metadata).toMatchObject({
      provider: "stripe",
      sessionId: "sess_abc",
      amountPaid: 4.99,
      currency: "USD",
    });
  });

  it("returns { handled: true, organizationId, creditAmount, transactionId } on success", async () => {
    mockedAddCredits.mockResolvedValueOnce({
      id: "tx_abc",
      organizationId: "org_123",
      type: "PURCHASE",
      amount: 500,
      balanceAfter: 500,
      createdAt: new Date(),
    });

    const result = await handleCreditPurchaseWebhook({
      provider: "polar",
      sessionId: "sess_polar_1",
      metadata: {
        type: CREDIT_PURCHASE_METADATA_TYPE,
        organizationId: "org_123",
        creditAmount: "500",
      },
    });

    expect(result).toEqual({
      handled: true,
      organizationId: "org_123",
      creditAmount: 500,
      transactionId: "tx_abc",
    });
  });

  it("handles duplicate addCredits error (message contains 'duplicate') → { skipped: 'already_processed' }", async () => {
    mockedAddCredits.mockRejectedValueOnce(new Error("duplicate relatedId detected"));

    const result = await handleCreditPurchaseWebhook({
      provider: "stripe",
      sessionId: "sess_dup",
      metadata: {
        type: CREDIT_PURCHASE_METADATA_TYPE,
        organizationId: "org_123",
        creditAmount: "500",
      },
    });

    expect(result).toEqual({ handled: true, skipped: "already_processed" });
  });

  it("handles duplicate addCredits error (message contains 'already_processed')", async () => {
    mockedAddCredits.mockRejectedValueOnce(new Error("already_processed for this relatedId"));

    const result = await handleCreditPurchaseWebhook({
      provider: "lemonsqueezy",
      sessionId: "sess_dup2",
      metadata: {
        type: CREDIT_PURCHASE_METADATA_TYPE,
        organizationId: "org_123",
        creditAmount: "500",
      },
    });

    expect(result).toEqual({ handled: true, skipped: "already_processed" });
  });

  it("rethrows unexpected errors (not matching duplicate pattern)", async () => {
    mockedAddCredits.mockRejectedValueOnce(new Error("database connection lost"));

    await expect(
      handleCreditPurchaseWebhook({
        provider: "chinapay",
        sessionId: "sess_err",
        metadata: {
          type: CREDIT_PURCHASE_METADATA_TYPE,
          organizationId: "org_123",
          creditAmount: "500",
        },
      }),
    ).rejects.toThrow("database connection lost");
  });
});
