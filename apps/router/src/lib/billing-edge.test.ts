import type { RouterKeySpend, RouterPriceRow, RouterSettleInput } from "@nebutra/repositories";
import { describe, expect, it, vi } from "vitest";
import type { RouterBilling } from "./billing-edge";
import { createRouterGuard } from "./billing-edge";
import type { EdgeAdmitInput, ParsedUsage } from "./openai-edge";

const identity = { keyId: "key_1", tenantId: "tenant_1", userId: "user_1" };

function price(over: Partial<RouterPriceRow> = {}): RouterPriceRow {
  return {
    modelName: "gpt-5",
    unit: "PER_1M_TOKENS",
    currency: "USD",
    published: true,
    isActive: true,
    inputPerMTok: 1,
    outputPerMTok: 10,
    cacheReadPerMTok: null,
    cacheWritePerMTok: null,
    unitPrice: null,
    ...over,
  };
}

function spend(over: Partial<RouterKeySpend> = {}): RouterKeySpend {
  return {
    keyId: "key_1",
    disabled: false,
    rateLimitRps: 10,
    limitDaily: null,
    limitTotal: null,
    costDaily: 0,
    costTotal: 0,
    ...over,
  };
}

function billing(over: Partial<RouterBilling> = {}): RouterBilling {
  return {
    findPrice: vi.fn(async () => price()),
    getKeySpend: vi.fn(async () => spend()),
    reserve: vi.fn(async () => true),
    release: vi.fn(async () => {}),
    sweepExpired: vi.fn(async () => ({ swept: 0, refunded: 0, tenantIds: [] })),
    settle: vi.fn(async () => ({ settled: true as const, charged: 0, refunded: 0 })),
    ...over,
  } as RouterBilling;
}

function admitInput(over: Partial<EdgeAdmitInput> = {}): EdgeAdmitInput {
  return {
    requestId: "req_1",
    identity,
    path: "chat/completions",
    models: ["gpt-5"],
    promptTokens: 1000,
    maxOutputTokens: 1000,
    ...over,
  };
}

function usage(over: Partial<ParsedUsage> = {}): ParsedUsage {
  return {
    model: "gpt-5",
    promptTokens: 1000,
    completionTokens: 500,
    totalTokens: 1500,
    cachedPromptTokens: 0,
    cacheWriteTokens: 0,
    errored: false,
    finishReason: "stop",
    ...over,
  };
}

describe("router money guard — admit", () => {
  it("holds the worst-case charge before the upstream call", async () => {
    const db = billing();
    const decision = await createRouterGuard(db).admit(admitInput());
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    // 1000 input @ $1/M + 1000 output @ $10/M = 0.011
    expect(decision.admission.reserved).toBeCloseTo(0.011, 6);
    expect(db.reserve).toHaveBeenCalledWith({
      tenantId: "tenant_1",
      requestId: "req_1",
      keyId: "key_1",
      amount: decision.admission.reserved,
    });
  });

  it("returns this tenant's stranded holds before it asks what they can afford", async () => {
    const order: string[] = [];
    const db = billing({
      sweepExpired: vi.fn(async () => {
        order.push("sweep");
        return { swept: 1, refunded: 0.02, tenantIds: ["tenant_1"] };
      }),
      reserve: vi.fn(async () => {
        order.push("reserve");
        return true;
      }),
    });
    const decision = await createRouterGuard(db).admit(admitInput());
    expect(decision.ok).toBe(true);
    expect(db.sweepExpired).toHaveBeenCalledWith({ tenantId: "tenant_1", limit: 8 });
    expect(order).toEqual(["sweep", "reserve"]);
  });

  it("still admits when the sweep fails — a stuck refund must not refuse a paying call", async () => {
    const db = billing({
      sweepExpired: vi.fn(async () => {
        throw new Error("sweep exploded");
      }),
    });
    const decision = await createRouterGuard(db).admit(admitInput());
    expect(decision.ok).toBe(true);
  });

  it("refuses an unknown model with 404, not 402 — no money question was asked", async () => {
    const decision = await createRouterGuard(billing({ findPrice: vi.fn(async () => null) })).admit(
      admitInput({ models: ["not-a-model"] }),
    );
    expect(decision).toMatchObject({ ok: false, status: 404, code: "unknown_model" });
  });

  it("refuses an unpublished model rather than relaying it for free", async () => {
    const decision = await createRouterGuard(
      billing({ findPrice: vi.fn(async () => price({ published: false })) }),
    ).admit(admitInput());
    expect(decision).toMatchObject({ ok: false, status: 403, code: "model_not_published" });
  });

  it("refuses a model whose row exists but carries no price", async () => {
    const decision = await createRouterGuard(
      billing({ findPrice: vi.fn(async () => price({ inputPerMTok: null })) }),
    ).admit(admitInput());
    expect(decision).toMatchObject({ ok: false, status: 403, code: "model_not_published" });
  });

  it("turns a failed hold into 402 insufficient_balance", async () => {
    const decision = await createRouterGuard(billing({ reserve: vi.fn(async () => false) })).admit(
      admitInput(),
    );
    expect(decision).toMatchObject({ ok: false, status: 402, code: "insufficient_balance" });
  });

  it("refuses with 402 key_quota_exceeded when the daily cap cannot cover the hold", async () => {
    const db = billing({
      getKeySpend: vi.fn(async () => spend({ limitDaily: 1, costDaily: 0.995 })),
    });
    const decision = await createRouterGuard(db).admit(admitInput());
    expect(decision).toMatchObject({ ok: false, status: 402, code: "key_quota_exceeded" });
    expect(db.reserve).not.toHaveBeenCalled();
  });

  it("refuses a disabled key without pricing anything", async () => {
    const db = billing({ getKeySpend: vi.fn(async () => spend({ disabled: true })) });
    const decision = await createRouterGuard(db).admit(admitInput());
    expect(decision).toMatchObject({ ok: false, status: 401, code: "key_disabled" });
    expect(db.findPrice).not.toHaveBeenCalled();
  });

  it("keeps only the priced candidates of a models[] chain and reserves the dearest", async () => {
    const db = billing({
      findPrice: vi.fn(async (model: string) => {
        if (model === "gone") return null;
        if (model === "cheap") return price({ modelName: "cheap", outputPerMTok: 2 });
        return price({ modelName: model });
      }),
    });
    const decision = await createRouterGuard(db).admit(
      admitInput({ models: ["gone", "cheap", "gpt-5"] }),
    );
    expect(decision.ok).toBe(true);
    if (!decision.ok) return;
    expect(decision.admission.candidates).toEqual(["cheap", "gpt-5"]);
    expect(decision.admission.reserved).toBeCloseTo(0.011, 6);
  });
});

describe("router money guard — settle", () => {
  it("writes one ledger row priced from the reported usage", async () => {
    const settle = vi.fn(async (_input: RouterSettleInput) => ({
      settled: true as const,
      charged: 0,
      refunded: 0,
    }));
    await createRouterGuard(billing({ settle })).settle({
      requestId: "req_1",
      identity,
      path: "chat/completions",
      admission: { reserved: 0.011, currency: "USD", candidates: ["gpt-5"] },
      usage: usage(),
      status: 200,
      latencyMs: 42,
      supplyPath: "channel-3",
      billable: true,
    });
    const written = settle.mock.calls[0]?.[0] as RouterSettleInput;
    expect(written).toMatchObject({
      tenantId: "tenant_1",
      keyId: "key_1",
      idempotencyKey: "router:req_1",
      model: "gpt-5",
      unit: "token",
      reserved: 0.011,
      currency: "USD",
    });
    // 1000 input @ $1/M + 500 output @ $10/M
    expect(written.totalCost).toBeCloseTo(0.006, 6);
    expect(written.quantity).toBe(1500);
  });

  it("prices an Anthropic cache read at the cache rate, not the input rate", async () => {
    const settle = vi.fn(async (_input: RouterSettleInput) => ({
      settled: true as const,
      charged: 0,
      refunded: 0,
    }));
    await createRouterGuard(
      billing({
        findPrice: vi.fn(async () => price({ cacheReadPerMTok: 0.1 })),
        settle,
      }),
    ).settle({
      requestId: "req_2",
      identity,
      path: "messages",
      admission: { reserved: 0.02, currency: "USD", candidates: ["gpt-5"] },
      usage: usage({ promptTokens: 2000, cachedPromptTokens: 1000, completionTokens: 0 }),
      status: 200,
      latencyMs: 5,
      supplyPath: null,
      billable: true,
    });
    const written = settle.mock.calls[0]?.[0] as RouterSettleInput;
    // 1000 fresh input @ $1/M + 1000 cached @ $0.1/M
    expect(written.totalCost).toBeCloseTo(0.0011, 6);
  });

  it("writes a zero-cost row and returns the whole hold when nothing was produced", async () => {
    const settle = vi.fn(async (_input: RouterSettleInput) => ({
      settled: true as const,
      charged: 0,
      refunded: 0.011,
    }));
    const db = billing({ settle });
    await createRouterGuard(db).settle({
      requestId: "req_3",
      identity,
      path: "chat/completions",
      admission: { reserved: 0.011, currency: "USD", candidates: ["gpt-5"] },
      usage: usage({ completionTokens: 0, finishReason: null, errored: true }),
      status: 200,
      latencyMs: 5,
      supplyPath: null,
      billable: false,
    });
    const written = settle.mock.calls[0]?.[0] as RouterSettleInput;
    expect(written.totalCost).toBe(0);
    expect(written.quantity).toBe(0);
    expect(written.reserved).toBe(0.011);
    expect(written.metadata).toMatchObject({ billable: false, refundReason: "error_in_body" });
    // Nothing is priced on a refund path — the price service is never consulted.
    expect(db.findPrice).not.toHaveBeenCalled();
  });

  it("names the upstream status as the refund reason for a non-2xx", async () => {
    const settle = vi.fn(async (_input: RouterSettleInput) => ({
      settled: true as const,
      charged: 0,
      refunded: 0.011,
    }));
    await createRouterGuard(billing({ settle })).settle({
      requestId: "req_4",
      identity,
      path: "chat/completions",
      admission: { reserved: 0.011, currency: "USD", candidates: ["gpt-5"] },
      usage: usage({ completionTokens: 0, finishReason: null }),
      status: 502,
      latencyMs: 5,
      supplyPath: null,
      billable: false,
    });
    const written = settle.mock.calls[0]?.[0] as RouterSettleInput;
    expect(written.metadata).toMatchObject({ refundReason: "upstream_status_502" });
  });

  it("settles against the model the upstream actually served after a failover", async () => {
    const settle = vi.fn(async (_input: RouterSettleInput) => ({
      settled: true as const,
      charged: 0,
      refunded: 0,
    }));
    await createRouterGuard(billing({ settle })).settle({
      requestId: "req_5",
      identity,
      path: "chat/completions",
      admission: { reserved: 0.02, currency: "USD", candidates: ["gpt-5", "claude-sonnet-4-5"] },
      usage: usage({ model: "claude-sonnet-4-5" }),
      status: 200,
      latencyMs: 5,
      supplyPath: null,
      billable: true,
    });
    expect((settle.mock.calls[0]?.[0] as RouterSettleInput).model).toBe("claude-sonnet-4-5");
  });

  it("releases the hold when the upstream never answered", async () => {
    const db = billing();
    await createRouterGuard(db).abandon({
      identity,
      admission: { reserved: 0.011, currency: "USD", candidates: ["gpt-5"] },
      requestId: "req_6",
    });
    expect(db.release).toHaveBeenCalledWith({
      tenantId: "tenant_1",
      requestId: "req_6",
      amount: 0.011,
    });
  });
});
