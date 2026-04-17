import { AppError, ERROR_CODES } from "@nebutra/errors";
import { logger } from "@nebutra/logger";
import type { MiddlewareHandler } from "hono";
import { streamSSE } from "hono/streaming";
import { resolveApiKey } from "./auth/api-key-resolver.js";
import { checkBalance } from "./auth/balance-guard.js";

export { resolveApiKey } from "./auth/api-key-resolver.js";
export { checkBalance, invalidateBalanceCache } from "./auth/balance-guard.js";
export {
  calculateCost,
  DEFAULT_PRICING,
  getModelPricing,
  type ModelConfigDeps,
  type ModelPricing,
} from "./metering/cost-calculator.js";
export type { MessageForCounting } from "./metering/tiktoken-fallback.js";
export { countTokens, estimateUsage } from "./metering/tiktoken-fallback.js";
// Token metering — extract usage from upstream, count tokens locally, compute cost.
export {
  createStreamingUsageExtractor,
  extractUsageFromJson,
  OpenAIUsageSchema,
} from "./metering/usage-extractor.js";
export {
  createGatewayAuthMiddleware as createGatewayPipelineMiddleware,
  type GatewayContextVars,
  type GatewayMiddlewareConfig,
} from "./middleware.js";
export type { CompletionEvent, GatewayConfig, ResolvedApiKey, UsageResult } from "./types.js";
export { CompletionEventSchema } from "./types.js";
export {
  COMPLETION_QUEUE,
  COMPLETION_TYPE,
  enqueueCompletion,
} from "./worker/completion-event.js";
export {
  processCompletionEvent,
  registerCompletionWorker,
  type WorkerDeps,
} from "./worker/completion-worker.js";

// TODO: These will be moved to @nebutra/provider-adapters later
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
        include?: { organization?: { select?: { plan?: boolean } } };
      }) => Promise<{
        id: string;
        organizationId: string;
        createdById: string | null;
        scopes: string[];
        rateLimitRps: number;
        revokedAt: Date | null;
        expiresAt: Date | null;
        organization: { plan: string };
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
 */
export const aiGatewayMiddleware = (): MiddlewareHandler<{ Variables: LegacyContextVars }> => {
  return async (c, next) => {
    // 1. Only intercept /chat/completions (You can adjust the mount path on the router)
    if (!c.req.path.endsWith("/chat/completions")) {
      return next();
    }

    const { model, messages, stream } = await c.req.json().catch(() => ({}));

    if (!model || !messages) {
      throw new AppError({
        code: ERROR_CODES.BAD_REQUEST,
        message: "Missing model or messages in request body",
      });
    }

    logger.info("Gateway intercept triggered", { model, stream });

    // 2. Fetch healthy upstream channel & credentials from DB layer
    // TODO: Connect this to @nebutra/key-pool
    // Mocking the channel selection for now (Step 1 requirement)
    const channel: UpstreamProviderConfig = {
      baseUrl: "https://api.openai.com/v1", // Replace with realistic base URL
      apiKey: process.env.OPENAI_API_KEY || "sk-dummy",
      provider: "openai",
    };

    // 3. Construct the upstream request
    // TODO: Connect this to @nebutra/provider-adapters if formatting differs (e.g. Anthropic)
    const upstreamUrl = `${channel.baseUrl}/chat/completions`;
    const upstreamOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channel.apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream }),
    };

    const upstreamResponse = await fetch(upstreamUrl, upstreamOptions);

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      logger.error("Upstream API Error", { status: upstreamResponse.status, errorText });
      return c.json({ error: "Upstream API Error" }, upstreamResponse.status as any);
    }

    // 4. Handle non-streaming responses
    if (!stream) {
      const rawJson = await upstreamResponse.json();

      // TODO: Async trigger to @nebutra/metering (BullMQ) -> token deduction
      // e.g. sendBillingEvent(c.get('organizationId'), rawJson.usage)

      return c.json(rawJson);
    }

    // 5. Handle Server-Sent Events (SSE) streaming responses
    return streamSSE(c, async (sse) => {
      const reader = upstreamResponse.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponseContent = ""; // Accumulator for billing

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

          // Relay chunk array (OpenAI occasionally groups multiple SSE events into one chunk)
          const lines = chunkText.split("\n").filter((line) => line.trim() !== "");
          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              const dataStr = line.replace("data: ", "");
              try {
                const data = JSON.parse(dataStr);
                const token = data.choices?.[0]?.delta?.content || "";
                fullResponseContent += token;

                // Write each SSE frame directly to the Client stream
                await sse.writeSSE({ data: dataStr });
              } catch (e) {
                logger.warn("Failed to parse SSE data chunk", { raw: line });
              }
            }
          }
        }
      } finally {
        reader.releaseLock();

        // 6. Streaming has finished! Now we calculate tokens and trigger the billing queue
        // TODO: dispatch BullMQ job via @nebutra/metering
        logger.info("Stream completed. Ready for token metering.", {
          responseLength: fullResponseContent.length,
          organizationId: c.get("organizationId"),
        });
      }
    });
  };
};
