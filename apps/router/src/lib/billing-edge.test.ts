import { logger } from "@nebutra/logger";
import type {
  RecordRequestLogInput,
  RouterKeySpend,
  RouterPriceRow,
  RouterSettleInput,
} from "@nebutra/repositories";
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
    saveLogs: false,
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
    images: 0,
    seconds: 0,
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
      ttfbMs: null,
      clientIp: null,
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
      ttfbMs: null,
      clientIp: null,
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
      ttfbMs: null,
      clientIp: null,
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
      ttfbMs: null,
      clientIp: null,
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
      ttfbMs: null,
      clientIp: null,
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

describe("router money guard — the request log", () => {
  const settleInput = (over: Partial<RouterSettleInput> = {}) =>
    ({
      requestId: "req_log",
      identity,
      path: "chat/completions",
      admission: { reserved: 0.02, currency: "USD", candidates: ["gpt-5"] },
      usage: usage({ cachedPromptTokens: 30, cacheWriteTokens: 5 }),
      status: 200,
      latencyMs: 1_400,
      ttfbMs: 220,
      supplyPath: "channel-7",
      clientIp: "203.0.113.9",
      billable: true,
      ...over,
    }) as unknown as Parameters<ReturnType<typeof createRouterGuard>["settle"]>[0];

  function logger() {
    return { record: vi.fn(async (_input: RecordRequestLogInput) => true) };
  }

  it("writes one log line alongside the ledger row", async () => {
    const log = logger();
    await createRouterGuard(billing(), log).settle(settleInput());
    expect(log.record).toHaveBeenCalledTimes(1);
    expect(log.record.mock.calls[0]?.[0]).toMatchObject({
      requestId: "req_log",
      tenantId: "tenant_1",
      apiKeyId: "key_1",
      model: "gpt-5",
      path: "chat/completions",
      httpStatus: 200,
      status: "success",
      ttfbMs: 220,
      cachedPromptTokens: 30,
      cacheWriteTokens: 5,
      supplyPath: "channel-7",
      clientIp: "203.0.113.9",
      saveLogs: false,
    });
  });

  it("passes the key's own saveLogs switch through", async () => {
    const log = logger();
    const db = billing({ getKeySpend: vi.fn(async () => spend({ saveLogs: true })) });
    await createRouterGuard(db, log).settle(settleInput());
    expect(log.record.mock.calls[0]?.[0]).toMatchObject({ saveLogs: true });
  });

  it("records why an unbillable request produced nothing", async () => {
    const log = logger();
    await createRouterGuard(billing(), log).settle(
      settleInput({ billable: false, status: 502 } as Partial<RouterSettleInput>),
    );
    expect(log.record.mock.calls[0]?.[0]).toMatchObject({
      status: "error",
      httpStatus: 502,
      errorMessage: "upstream_status_502",
      cost: 0,
    });
  });

  it("still settles when the log cannot be written", async () => {
    const db = billing();
    const log = { record: vi.fn(async (_input: RecordRequestLogInput) => false) };
    await expect(createRouterGuard(db, log).settle(settleInput())).resolves.toBeUndefined();
    expect(db.settle).toHaveBeenCalledTimes(1);
  });
});

describe("router money guard — post-paid multipart settlement", () => {
  const imageRow = (): RouterPriceRow =>
    price({
      modelName: "gpt-image-2",
      unit: "PER_IMAGE",
      inputPerMTok: null,
      outputPerMTok: null,
      unitPrice: 0.04,
    });

  const postPaid = (over: Record<string, unknown> = {}) =>
    ({
      requestId: "req_img",
      identity,
      path: "images/edits",
      // No hold was taken: the model was a form field, so there was nothing to
      // price before the upload moved.
      admission: null,
      usage: usage({
        model: "gpt-image-2",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        images: 2,
      }),
      status: 200,
      latencyMs: 900,
      ttfbMs: 400,
      supplyPath: null,
      clientIp: null,
      billable: true,
      ...over,
    }) as unknown as Parameters<ReturnType<typeof createRouterGuard>["settle"]>[0];

  it("charges the images the upstream returned, against no reservation", async () => {
    const settle = vi.fn(async (_input: RouterSettleInput) => ({
      settled: true as const,
      charged: 0.08,
      refunded: 0,
    }));
    const db = billing({ settle, findPrice: vi.fn(async () => imageRow()) });
    await createRouterGuard(db, { record: vi.fn(async () => true) }).settle(postPaid());
    const written = settle.mock.calls[0]?.[0] as RouterSettleInput;
    expect(written).toMatchObject({
      model: "gpt-image-2",
      unit: "image",
      quantity: 2,
      totalCost: 0.08,
      // Nothing was held, so nothing comes back — settle is a plain debit.
      reserved: 0,
    });
    expect(written.metadata).toMatchObject({ postPaid: true });
  });

  it("prices an audio transcription by its seconds", async () => {
    const settle = vi.fn(async (_input: RouterSettleInput) => ({
      settled: true as const,
      charged: 0.075,
      refunded: 0,
    }));
    const db = billing({
      settle,
      findPrice: vi.fn(async () =>
        price({
          modelName: "whisper-1",
          unit: "PER_SECOND",
          inputPerMTok: null,
          outputPerMTok: null,
          unitPrice: 0.006,
        }),
      ),
    });
    await createRouterGuard(db, { record: vi.fn(async () => true) }).settle(
      postPaid({
        path: "audio/transcriptions",
        usage: usage({
          model: "whisper-1",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          seconds: 12.5,
        }),
      }),
    );
    expect(settle.mock.calls[0]?.[0]).toMatchObject({
      unit: "second",
      quantity: 12.5,
      totalCost: 0.075,
    });
  });

  it("charges nothing, loudly, when the upload never revealed its model", async () => {
    const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const settle = vi.fn(async (_input: RouterSettleInput) => ({
      settled: true as const,
      charged: 0,
      refunded: 0,
    }));
    const log = { record: vi.fn(async () => true) };
    await createRouterGuard(billing({ settle }), log).settle(
      postPaid({ usage: usage({ model: "unknown", images: 1 }) }),
    );
    const written = settle.mock.calls[0]?.[0] as RouterSettleInput;
    expect(written).toMatchObject({ model: "unknown", totalCost: 0, quantity: 0 });
    expect(written.metadata).toMatchObject({ unpriced: "model_unreadable" });
    expect(warn).toHaveBeenCalledWith(
      "[router] post-paid request settled with no readable model",
      expect.objectContaining({ requestId: "req_img", path: "images/edits" }),
    );
    // The customer still sees the request happened.
    expect(log.record).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe("router money guard — refusals are visible", () => {
  it("writes a zero-cost log row naming the refusal code", async () => {
    const log = { record: vi.fn(async (_input: RecordRequestLogInput) => true) };
    await createRouterGuard(billing(), log).noteRefusal({
      requestId: "req_denied",
      identity,
      path: "chat/completions",
      status: 402,
      code: "insufficient_balance",
      model: "gpt-5",
    });
    expect(log.record.mock.calls[0]?.[0]).toMatchObject({
      requestId: "req_denied",
      tenantId: "tenant_1",
      apiKeyId: "key_1",
      model: "gpt-5",
      path: "chat/completions",
      httpStatus: 402,
      status: "refused",
      cost: 0,
      errorMessage: "insufficient_balance",
    });
  });

  it("survives a log write that fails", async () => {
    const log = { record: vi.fn(async () => Promise.reject(new Error("down"))) };
    await expect(
      createRouterGuard(billing(), log as never).noteRefusal({
        requestId: "req_denied",
        identity,
        path: "chat/completions",
        status: 429,
        code: "rate_limit_exceeded",
        model: null,
      }),
    ).resolves.toBeUndefined();
  });
});
