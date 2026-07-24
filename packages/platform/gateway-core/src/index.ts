import { AppError, ERROR_CODES } from "@nebutra/errors";
import { logger } from "@nebutra/logger";
import type { MiddlewareHandler } from "hono";
import { streamSSE } from "hono/streaming";
import { resolveApiKey } from "./auth/api-key-resolver";
import { checkBalance } from "./auth/balance-guard";
import { estimateUsage } from "./metering/tiktoken-fallback";
import { createStreamingUsageExtractor, extractUsageFromJson } from "./metering/usage-extractor";
import { type EnqueueDeps, enqueueCompletion } from "./worker/completion-event";

export { resolveApiKey } from "./auth/api-key-resolver";
export { checkBalance, invalidateBalanceCache } from "./auth/balance-guard";
export {
  calculateCost,
  DEFAULT_PRICING,
  getModelPricing,
  type ModelConfigDeps,
  type ModelPricing,
} from "./metering/cost-calculator";
export type { MessageForCounting } from "./metering/tiktoken-fallback";
export { countTokens, estimateUsage } from "./metering/tiktoken-fallback";
// Token metering — extract usage from upstream, count tokens locally, compute cost.
export {
  createStreamingUsageExtractor,
  extractUsageFromJson,
  OpenAIUsageSchema,
} from "./metering/usage-extractor";
export {
  createGatewayAuthMiddleware as createGatewayPipelineMiddleware,
  type GatewayContextVars,
  type GatewayMiddlewareConfig,
} from "./middleware";
export type { CompletionEvent, GatewayConfig, ResolvedApiKey, UsageResult } from "./types";
export { CompletionEventSchema } from "./types";
export {
  COMPLETION_QUEUE,
  COMPLETION_TYPE,
  type EnqueueDeps,
  enqueueCompletion,
} from "./worker/completion-event";
export {
  processCompletionEvent,
  registerCompletionWorker,
  type WorkerDeps,
} from "./worker/completion-worker";

/**
 * Minimal upstream channel config for the legacy AI intercept middleware.
 * Production multi-upstream selection lives in backends/gateway
 * `createAiGatewayRoutes` (AI_GATEWAY_UPSTREAMS). This package does not
 * depend on a separate `@nebutra/key-pool` package — channel pick is
 * env-driven and optional-injectable for tests.
 */
interface UpstreamProviderConfig {
  baseUrl: string;
  apiKey: string;
  provider: string; // 'openai' | 'anthropic' etc.
}

// Legacy context vars — prefer GatewayContextVars from types.ts for gateway routes
interface LegacyContextVars {
  userId: string;
  organizationId: string;
}

export interface AiGatewayMiddlewareOptions {
  /**
   * Resolve the upstream channel. Default: env
   * `OPENAI_BASE_URL` / `OPENAI_API_KEY` (feature-flag style — no hard-coded secrets).
   */
  resolveChannel?: () => UpstreamProviderConfig | Promise<UpstreamProviderConfig>;
  /**
   * When provided, successful completions enqueue a billing-closure event
   * via `enqueueCompletion`. When omitted, metering is a documented no-op
   * (metric: log line only).
   */
  queue?: EnqueueDeps["queue"];
}

function defaultEnvChannel(): UpstreamProviderConfig {
  return {
    baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
    apiKey: process.env.OPENAI_API_KEY || "sk-dummy",
    provider: process.env.AI_CUSTOM_PROVIDER ?? "openai",
  };
}

/**
 * Dependencies required to create the gateway auth middleware.
 */
interface GatewayAuthDeps {
  redis: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, opts?: { ex?: number }) => Promise<unknown>;
    del: (key: string) => Promise<unknown>;
  };
  prisma: {
    aPIKey: {
      findUnique: (args: {
        where: { keyHash: string };
        include?: { tenant?: { include?: { organization?: { select?: { plan?: boolean } } } } };
      }) => Promise<{
        id: string;
        organizationId: string;
        createdById: string | null;
        scopes: string[];
        rateLimitRps: number;
        revokedAt: Date | null;
        expiresAt: Date | null;
        tenant: { organization: { plan: string } | null };
      } | null>;
      update: (args: { where: { id: string }; data: { lastUsedAt: Date } }) => Promise<unknown>;
    };
  };
  getCreditBalance: (organizationId: string) => Promise<number>;
}

/**
 * Creates Hono middleware that:
 * 1. Extracts the Bearer token from the Authorization header
 * 2. Resolves and validates the `sk-sailor-*` API key via Redis cache + Prisma
 * 3. Checks the organization's credit balance
 * 4. Sets `resolvedApiKey` and `gatewayRequestId` on the Hono context
 */
export function createGatewayAuthMiddleware(deps: GatewayAuthDeps): MiddlewareHandler {
  return async (c, next) => {
    const requestId = c.get("requestId") ?? crypto.randomUUID();
    c.set("gatewayRequestId" as never, requestId);

    // Extract Bearer token
    const authHeader = c.req.header("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return c.json({ error: "Missing or invalid Authorization header" }, 401);
    }
    const token = authHeader.slice(7);

    // Resolve API key
    let resolved;
    try {
      resolved = await resolveApiKey(token, {
        redis: deps.redis,
        prisma: deps.prisma,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid API key";
      return c.json({ error: message }, 401);
    }

    // Check credit balance
    try {
      await checkBalance(resolved.organizationId, deps.redis, deps.getCreditBalance);
    } catch {
      return c.json({ error: "Insufficient credit balance" }, 402);
    }

    c.set("resolvedApiKey" as never, resolved);
    await next();
  };
}

/**
 * AI Gateway Middleware Factory
 * Extracted from Hono router so it can be independently tested and versioned.
 *
 * Production path: prefer `createAiGatewayRoutes` in backends/gateway (multi-upstream,
 * key auth, usage extractor). This middleware remains the unit-testable intercept
 * surface for simple OpenAI-compatible proxying + optional metering enqueue.
 */
export const aiGatewayMiddleware = (
  options: AiGatewayMiddlewareOptions = {},
): MiddlewareHandler<{ Variables: LegacyContextVars }> => {
  const resolveChannel = options.resolveChannel ?? defaultEnvChannel;
  const queue = options.queue;

  return async (c, next) => {
    // 1. Only intercept /chat/completions (You can adjust the mount path on the router)
    if (!c.req.path.endsWith("/chat/completions")) {
      return next();
    }

    const startedAt = Date.now();
    const { model, messages, stream } = await c.req.json().catch(() => ({}));

    if (!model || !messages) {
      throw new AppError({
        code: ERROR_CODES.BAD_REQUEST,
        message: "Missing model or messages in request body",
      });
    }

    logger.info("Gateway intercept triggered", { model, stream });

    // 2. Channel selection — injectable or env-backed (no hard-coded secrets).
    const channel = await resolveChannel();

    // 3. Construct the upstream request (OpenAI-compatible wire format).
    const upstreamUrl = `${channel.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const upstreamOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channel.apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream }),
      // Hard deadline so hung upstreams cannot pin gateway workers indefinitely.
      signal: AbortSignal.timeout(30_000),
    };

    const upstreamResponse = await fetch(upstreamUrl, upstreamOptions);

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      logger.error("Upstream API Error", { status: upstreamResponse.status, errorText });
      const status = upstreamResponse.status;
      const safeStatus =
        status === 400 ||
        status === 401 ||
        status === 402 ||
        status === 403 ||
        status === 404 ||
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503
          ? status
          : 502;
      return c.json({ error: "Upstream API Error" }, safeStatus);
    }

    const organizationId = c.get("organizationId") ?? "unknown";
    const requestId =
      (c.get("gatewayRequestId" as never) as string | undefined) ?? crypto.randomUUID();

    async function maybeEnqueueMetering(usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    }) {
      if (!queue) {
        logger.info("Metering no-op: queue not configured on aiGatewayMiddleware", {
          requestId,
          organizationId,
          model,
          ...usage,
        });
        return;
      }
      await enqueueCompletion(
        {
          requestId,
          apiKeyId: null,
          organizationId,
          userId: c.get("userId") ?? null,
          model: String(model),
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          latencyMs: Date.now() - startedAt,
          status: "success",
        },
        { queue },
      );
    }

    const modelId = String(model);
    const messageList = Array.isArray(messages)
      ? (messages as Array<{ role: string; content: string }>)
      : [];

    // 4. Handle non-streaming responses
    if (!stream) {
      const rawJson: unknown = await upstreamResponse.json();
      const usage =
        extractUsageFromJson(rawJson, modelId) ??
        estimateUsage(messageList, JSON.stringify(rawJson), modelId);
      void maybeEnqueueMetering(usage);
      return c.json(rawJson);
    }

    // 5. Handle Server-Sent Events (SSE) streaming responses
    return streamSSE(c, async (sse) => {
      const reader = upstreamResponse.body?.getReader();
      const decoder = new TextDecoder();
      const extractor = createStreamingUsageExtractor(modelId);

      if (!reader) {
        throw new AppError({
          code: ERROR_CODES.INTERNAL_ERROR,
          message: "Response body is not readable",
        });
      }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Note: OpenAI sends "[DONE]" at the very end
            await sse.writeSSE({ data: "[DONE]" });
            break;
          }

          const chunkText = decoder.decode(value, { stream: true });
          extractor.processChunk(chunkText);

          // Relay chunk array (OpenAI occasionally groups multiple SSE events into one chunk)
          const lines = chunkText.split("\n").filter((line) => line.trim() !== "");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              const dataStr = line.replace("data: ", "");
              await sse.writeSSE({ data: dataStr });
            }
          }
        }
      } finally {
        reader.releaseLock();

        const fullResponseContent = extractor.getAccumulatedContent();
        const usage =
          extractor.getUsage() ?? estimateUsage(messageList, fullResponseContent, modelId);

        logger.info("Stream completed; enqueueing token metering.", {
          responseLength: fullResponseContent.length,
          organizationId,
          requestId,
        });
        void maybeEnqueueMetering(usage);
      }
    });
  };
};
