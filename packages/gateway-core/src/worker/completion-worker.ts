import type { CompletionEvent } from "../types.js";

// ---------------------------------------------------------------------------
// Dependency interfaces
// ---------------------------------------------------------------------------

export interface ModelPricing {
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  currency: string;
}

export interface UsageInput {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  model: string;
}

export interface DeductCreditsInput {
  organizationId: string;
  amount: number;
  description?: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}

export interface MeteringEvent {
  meterId: string;
  tenantId: string;
  value: number;
  properties?: Record<string, unknown>;
  idempotencyKey?: string;
}

export interface WorkerLogger {
  info: (...a: unknown[]) => void;
  warn: (...a: unknown[]) => void;
  error: (...a: unknown[]) => void;
}

export interface WorkerDeps {
  prisma: {
    requestLog: {
      findUnique: (args: { where: { requestId: string } }) => Promise<unknown>;
      create: (args: { data: unknown }) => Promise<unknown>;
    };
    $transaction: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
  };
  redis: {
    del: (key: string) => Promise<unknown>;
  };
  getModelPricing: (model: string) => Promise<ModelPricing>;
  calculateCost: (usage: UsageInput, pricing: ModelPricing) => number;
  deductCredits: (input: DeductCreditsInput) => Promise<unknown>;
  dollarsToCredits: (dollars: number) => number;
  invalidateBalanceCache: (orgId: string) => Promise<void>;
  ingestUsage?: (event: MeteringEvent) => Promise<void>;
  logger?: WorkerLogger;
}

// ---------------------------------------------------------------------------
// Queue topology constants (match completion-event.ts)
// ---------------------------------------------------------------------------

const QUEUE_NAME = "ai-gateway";
const JOB_TYPE = "completion";
const AI_TOKENS_METER_ID = "ai_tokens";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface RequestLogData {
  requestId: string;
  organizationId: string;
  apiKeyId: string | null;
  userId: string | null;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  cost: number;
  status: CompletionEvent["status"];
  errorMessage: string | null;
}

function buildRequestLogData(
  event: CompletionEvent,
  overrides: Partial<RequestLogData> = {},
): RequestLogData {
  return {
    requestId: event.requestId,
    organizationId: event.organizationId,
    apiKeyId: event.apiKeyId,
    userId: event.userId,
    model: event.model,
    promptTokens: event.promptTokens,
    completionTokens: event.completionTokens,
    totalTokens: event.totalTokens,
    latencyMs: event.latencyMs,
    cost: 0,
    status: event.status,
    errorMessage: event.errorMessage ?? null,
    ...overrides,
  };
}

async function safeCall<T>(
  fn: () => Promise<T>,
  onError: (err: unknown) => void,
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (err) {
    onError(err);
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Core processor
// ---------------------------------------------------------------------------

/**
 * Process a single completion event from the billing-closure queue.
 *
 * Guarantees:
 *  - Idempotent via `RequestLog.requestId` (source of truth).
 *  - Never throws — any failure is logged and swallowed to prevent
 *    BullMQ/QStash retry storms.
 *  - Skips deduction for non-success events but still logs them.
 *  - On `INSUFFICIENT_CREDITS` from billing, records a
 *    `status=insufficient_credits` log entry instead of rethrowing.
 */
export async function processCompletionEvent(
  event: CompletionEvent,
  deps: WorkerDeps,
): Promise<void> {
  const log = deps.logger;

  // 1. Idempotency check
  let existing: unknown;
  try {
    existing = await deps.prisma.requestLog.findUnique({
      where: { requestId: event.requestId },
    });
  } catch (err) {
    log?.error("processCompletionEvent: findUnique failed", {
      requestId: event.requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (existing) {
    log?.info("processCompletionEvent: duplicate, skipping", {
      requestId: event.requestId,
    });
    return;
  }

  // 2. Non-billing statuses — log and exit
  if (event.status !== "success") {
    await safeCall(
      () => deps.prisma.requestLog.create({ data: buildRequestLogData(event) }),
      (err) =>
        log?.error("processCompletionEvent: requestLog.create failed (non-success)", {
          requestId: event.requestId,
          error: err instanceof Error ? err.message : String(err),
        }),
    );
    return;
  }

  // 3. Pricing
  let pricing: ModelPricing;
  try {
    pricing = await deps.getModelPricing(event.model);
  } catch (err) {
    log?.error("processCompletionEvent: getModelPricing failed", {
      requestId: event.requestId,
      model: event.model,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  // 4. Cost calculation
  let costDollars: number;
  try {
    costDollars = deps.calculateCost(
      {
        promptTokens: event.promptTokens,
        completionTokens: event.completionTokens,
        totalTokens: event.totalTokens,
        model: event.model,
      },
      pricing,
    );
  } catch (err) {
    log?.error("processCompletionEvent: calculateCost failed", {
      requestId: event.requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  // 5. Deduct credits + write log (transactional)
  const creditsAmount = deps.dollarsToCredits(costDollars);

  try {
    await deps.deductCredits({
      organizationId: event.organizationId,
      amount: creditsAmount,
      description: `AI usage: ${event.model}`,
      relatedId: event.requestId,
      metadata: {
        model: event.model,
        promptTokens: event.promptTokens,
        completionTokens: event.completionTokens,
        totalTokens: event.totalTokens,
      },
    });

    await safeCall(
      () =>
        deps.prisma.requestLog.create({
          data: buildRequestLogData(event, {
            cost: costDollars,
            status: "success",
          }),
        }),
      (err) =>
        log?.error("processCompletionEvent: requestLog.create failed (success path)", {
          requestId: event.requestId,
          error: err instanceof Error ? err.message : String(err),
        }),
    );
  } catch (err) {
    // Likely INSUFFICIENT_CREDITS — still log, never rethrow
    log?.error("processCompletionEvent: deductCredits failed", {
      requestId: event.requestId,
      organizationId: event.organizationId,
      amount: creditsAmount,
      error: err instanceof Error ? err.message : String(err),
    });

    await safeCall(
      () =>
        deps.prisma.requestLog.create({
          data: buildRequestLogData(event, {
            cost: costDollars,
            status: "insufficient_credits",
            errorMessage: err instanceof Error ? err.message : "deduction failed",
          }),
        }),
      (createErr) =>
        log?.error("processCompletionEvent: requestLog.create failed (after deduction error)", {
          requestId: event.requestId,
          error: createErr instanceof Error ? createErr.message : String(createErr),
        }),
    );
    return;
  }

  // 6. Cache invalidation (non-critical)
  await safeCall(
    () => deps.invalidateBalanceCache(event.organizationId),
    (err) =>
      log?.warn("processCompletionEvent: invalidateBalanceCache failed", {
        requestId: event.requestId,
        error: err instanceof Error ? err.message : String(err),
      }),
  );

  // 7. Metering ingestion (optional, non-critical)
  if (deps.ingestUsage) {
    await safeCall(
      () =>
        deps.ingestUsage!({
          meterId: AI_TOKENS_METER_ID,
          tenantId: event.organizationId,
          value: event.totalTokens,
          properties: {
            model: event.model,
            promptTokens: event.promptTokens,
            completionTokens: event.completionTokens,
            apiKeyId: event.apiKeyId,
            userId: event.userId,
          },
          idempotencyKey: event.requestId,
        }),
      (err) =>
        log?.warn("processCompletionEvent: ingestUsage failed", {
          requestId: event.requestId,
          error: err instanceof Error ? err.message : String(err),
        }),
    );
  }

  log?.info("processCompletionEvent: closed", {
    requestId: event.requestId,
    organizationId: event.organizationId,
    model: event.model,
    costDollars,
    creditsAmount,
  });
}

/**
 * Register the completion handler with the queue provider.
 * Call once at app startup (typically when the API gateway boots).
 */
export function registerCompletionWorker(
  queue: {
    registerHandler: (
      queue: string,
      type: string,
      handler: (job: { data: CompletionEvent }) => Promise<void>,
    ) => void;
  },
  deps: WorkerDeps,
): void {
  queue.registerHandler(QUEUE_NAME, JOB_TYPE, async (job) => {
    await processCompletionEvent(job.data, deps);
  });
}
