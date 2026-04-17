import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompletionEvent } from "../../types.js";
import {
  processCompletionEvent,
  registerCompletionWorker,
  type WorkerDeps,
} from "../completion-worker.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseEvent: CompletionEvent = {
  requestId: "req_abc123",
  apiKeyId: "key_001",
  organizationId: "org_123",
  userId: "user_456",
  model: "gpt-4o-mini",
  promptTokens: 1000,
  completionTokens: 500,
  totalTokens: 1500,
  latencyMs: 1234,
  status: "success",
  errorMessage: null,
};

function createDeps(overrides: Partial<WorkerDeps> = {}): WorkerDeps & {
  prisma: {
    requestLog: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  redis: { del: ReturnType<typeof vi.fn> };
  getModelPricing: ReturnType<typeof vi.fn>;
  calculateCost: ReturnType<typeof vi.fn>;
  deductCredits: ReturnType<typeof vi.fn>;
  dollarsToCredits: ReturnType<typeof vi.fn>;
  invalidateBalanceCache: ReturnType<typeof vi.fn>;
  ingestUsage: ReturnType<typeof vi.fn>;
  logger: {
    info: ReturnType<typeof vi.fn>;
    warn: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
} {
  const requestLog = {
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: "log_1" }),
  };
  const prisma = {
    requestLog,
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({ requestLog })),
  };
  const redis = {
    del: vi.fn().mockResolvedValue(1),
  };
  const getModelPricing = vi.fn().mockResolvedValue({
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
    currency: "USD",
  });
  const calculateCost = vi.fn().mockReturnValue(0.00045);
  const deductCredits = vi.fn().mockResolvedValue({ newBalance: 9999 });
  const dollarsToCredits = vi.fn().mockReturnValue(45);
  const invalidateBalanceCache = vi.fn().mockResolvedValue(undefined);
  const ingestUsage = vi.fn().mockResolvedValue(undefined);
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };

  return {
    prisma,
    redis,
    getModelPricing,
    calculateCost,
    deductCredits,
    dollarsToCredits,
    invalidateBalanceCache,
    ingestUsage,
    logger,
    ...overrides,
  } as ReturnType<typeof createDeps>;
}

// ---------------------------------------------------------------------------
// processCompletionEvent
// ---------------------------------------------------------------------------

describe("processCompletionEvent — success path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches pricing for the event model", async () => {
    const deps = createDeps();
    await processCompletionEvent(baseEvent, deps);

    expect(deps.getModelPricing).toHaveBeenCalledWith(baseEvent.model);
  });

  it("calculates cost from usage + pricing", async () => {
    const deps = createDeps();
    await processCompletionEvent(baseEvent, deps);

    expect(deps.calculateCost).toHaveBeenCalledWith(
      {
        promptTokens: baseEvent.promptTokens,
        completionTokens: baseEvent.completionTokens,
        totalTokens: baseEvent.totalTokens,
        model: baseEvent.model,
      },
      expect.objectContaining({
        inputPricePerMillion: 0.15,
        outputPricePerMillion: 0.6,
      }),
    );
  });

  it("deducts credits via the billing API", async () => {
    const deps = createDeps();
    await processCompletionEvent(baseEvent, deps);

    expect(deps.dollarsToCredits).toHaveBeenCalledWith(0.00045);
    expect(deps.deductCredits).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: baseEvent.organizationId,
        amount: 45,
        relatedId: baseEvent.requestId,
      }),
    );
  });

  it("creates a RequestLog row with correct shape", async () => {
    const deps = createDeps();
    await processCompletionEvent(baseEvent, deps);

    expect(deps.prisma.requestLog.create).toHaveBeenCalledTimes(1);
    const arg = deps.prisma.requestLog.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data).toMatchObject({
      requestId: baseEvent.requestId,
      organizationId: baseEvent.organizationId,
      apiKeyId: baseEvent.apiKeyId,
      userId: baseEvent.userId,
      model: baseEvent.model,
      promptTokens: baseEvent.promptTokens,
      completionTokens: baseEvent.completionTokens,
      totalTokens: baseEvent.totalTokens,
      latencyMs: baseEvent.latencyMs,
      status: "success",
    });
    expect(arg.data.cost).toBeDefined();
  });

  it("invalidates the organization's balance cache", async () => {
    const deps = createDeps();
    await processCompletionEvent(baseEvent, deps);

    expect(deps.invalidateBalanceCache).toHaveBeenCalledWith(baseEvent.organizationId);
  });

  it("ingests a metering event when ingestUsage is provided", async () => {
    const deps = createDeps();
    await processCompletionEvent(baseEvent, deps);

    expect(deps.ingestUsage).toHaveBeenCalledTimes(1);
    const meteringEvent = deps.ingestUsage!.mock.calls[0][0] as {
      meterId: string;
      tenantId: string;
      value: number;
      idempotencyKey?: string;
    };
    expect(meteringEvent.tenantId).toBe(baseEvent.organizationId);
    expect(meteringEvent.value).toBe(baseEvent.totalTokens);
    expect(meteringEvent.idempotencyKey).toBe(baseEvent.requestId);
  });
});

describe("processCompletionEvent — idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips all work when requestLog already exists", async () => {
    const deps = createDeps();
    deps.prisma.requestLog.findUnique.mockResolvedValueOnce({
      id: "log_existing",
      requestId: baseEvent.requestId,
    });

    await processCompletionEvent(baseEvent, deps);

    expect(deps.getModelPricing).not.toHaveBeenCalled();
    expect(deps.calculateCost).not.toHaveBeenCalled();
    expect(deps.deductCredits).not.toHaveBeenCalled();
    expect(deps.prisma.requestLog.create).not.toHaveBeenCalled();
    expect(deps.invalidateBalanceCache).not.toHaveBeenCalled();
    expect(deps.ingestUsage).not.toHaveBeenCalled();
  });

  it("uses requestId as the unique lookup key", async () => {
    const deps = createDeps();
    await processCompletionEvent(baseEvent, deps);

    expect(deps.prisma.requestLog.findUnique).toHaveBeenCalledWith({
      where: { requestId: baseEvent.requestId },
    });
  });
});

describe("processCompletionEvent — insufficient credits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records insufficient_credits status + does NOT rethrow when deductCredits fails", async () => {
    const deps = createDeps();
    deps.deductCredits.mockRejectedValueOnce(new Error("INSUFFICIENT_CREDITS"));

    await expect(processCompletionEvent(baseEvent, deps)).resolves.toBeUndefined();

    expect(deps.prisma.requestLog.create).toHaveBeenCalledTimes(1);
    const arg = deps.prisma.requestLog.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.status).toBe("insufficient_credits");
    expect(deps.logger.error).toHaveBeenCalled();
  });
});

describe("processCompletionEvent — error-status events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs to RequestLog but skips deduction for error events", async () => {
    const deps = createDeps();
    const errorEvent: CompletionEvent = {
      ...baseEvent,
      status: "error",
      errorMessage: "Upstream timeout",
    };

    await processCompletionEvent(errorEvent, deps);

    expect(deps.deductCredits).not.toHaveBeenCalled();
    expect(deps.getModelPricing).not.toHaveBeenCalled();
    expect(deps.prisma.requestLog.create).toHaveBeenCalledTimes(1);
    const arg = deps.prisma.requestLog.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(arg.data.status).toBe("error");
    expect(arg.data.errorMessage).toBe("Upstream timeout");
  });

  it("skips deduction for rate_limited events", async () => {
    const deps = createDeps();
    const rlEvent: CompletionEvent = { ...baseEvent, status: "rate_limited" };

    await processCompletionEvent(rlEvent, deps);

    expect(deps.deductCredits).not.toHaveBeenCalled();
    expect(deps.prisma.requestLog.create).toHaveBeenCalledTimes(1);
  });
});

describe("processCompletionEvent — optional ingestUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("works without ingestUsage provided", async () => {
    const { ingestUsage: _ignored, ...rest } = createDeps();
    const deps = rest as WorkerDeps;

    await expect(processCompletionEvent(baseEvent, deps)).resolves.toBeUndefined();
  });
});

describe("processCompletionEvent — never throws", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("swallows errors from findUnique", async () => {
    const deps = createDeps();
    deps.prisma.requestLog.findUnique.mockRejectedValueOnce(new Error("db down"));

    await expect(processCompletionEvent(baseEvent, deps)).resolves.toBeUndefined();
    expect(deps.logger.error).toHaveBeenCalled();
  });

  it("swallows errors from getModelPricing", async () => {
    const deps = createDeps();
    deps.getModelPricing.mockRejectedValueOnce(new Error("pricing not found"));

    await expect(processCompletionEvent(baseEvent, deps)).resolves.toBeUndefined();
    expect(deps.logger.error).toHaveBeenCalled();
  });

  it("swallows errors from invalidateBalanceCache", async () => {
    const deps = createDeps();
    deps.invalidateBalanceCache.mockRejectedValueOnce(new Error("redis down"));

    await expect(processCompletionEvent(baseEvent, deps)).resolves.toBeUndefined();
  });

  it("swallows errors from ingestUsage", async () => {
    const deps = createDeps();
    deps.ingestUsage.mockRejectedValueOnce(new Error("clickhouse down"));

    await expect(processCompletionEvent(baseEvent, deps)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// registerCompletionWorker
// ---------------------------------------------------------------------------

describe("registerCompletionWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers handler under ai-gateway queue + completion type", () => {
    const deps = createDeps();
    const queue = { registerHandler: vi.fn() };

    registerCompletionWorker(queue, deps);

    expect(queue.registerHandler).toHaveBeenCalledTimes(1);
    expect(queue.registerHandler).toHaveBeenCalledWith(
      "ai-gateway",
      "completion",
      expect.any(Function),
    );
  });

  it("the registered handler invokes processCompletionEvent with job.data", async () => {
    const deps = createDeps();
    let captured: ((job: { data: CompletionEvent }) => Promise<void>) | undefined;
    const queue = {
      registerHandler: vi.fn((_q: string, _t: string, h: typeof captured) => {
        captured = h;
      }),
    };

    registerCompletionWorker(queue, deps);
    expect(captured).toBeDefined();

    await captured!({ data: baseEvent });

    // processCompletionEvent side effects — pricing fetched for this event's model
    expect(deps.getModelPricing).toHaveBeenCalledWith(baseEvent.model);
  });
});
