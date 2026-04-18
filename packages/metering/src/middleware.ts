import { logger } from "@nebutra/logger";
import type { MeteringProvider } from "./types";

// =============================================================================
// Metering Middleware — Hono integration for automatic API metering
// =============================================================================
// Automatically records API call events with request context.
// Can be used standalone or as part of a middleware chain.
// =============================================================================

/**
 * Create a Hono middleware that automatically meters API calls.
 *
 * @example
 * ```ts
 * import { Hono } from "hono";
 * import { getMetering } from "@nebutra/metering";
 * import { meterApiCall } from "@nebutra/metering";
 *
 * const app = new Hono();
 * const metering = await getMetering();
 *
 * app.use("*", meterApiCall("api_calls", metering));
 *
 * app.get("/api/data", (c) => {
 *   return c.json({ ok: true });
 * });
 * ```
 */
export function meterApiCall(meterId: string, provider: MeteringProvider) {
  return async (c: any, next: () => Promise<void>) => {
    try {
      // Get tenant ID from request context (assumes it's been set by auth middleware)
      const tenantId = c.get("tenantId") || c.get("userId") || "anonymous";

      // Record basic dimensions
      const properties = {
        method: c.req.method,
        path: new URL(c.req.url).pathname,
        status: 200, // Will be updated after handler runs
      };

      // Call the next handler
      const startTime = performance.now();
      await next();
      const endTime = performance.now();

      // Update with actual status
      if (c.res) {
        properties.status = c.res.status;
      }

      // Record latency as a property
      const latencyMs = Math.round(endTime - startTime);

      // Ingest the event
      await provider.ingest({
        meterId,
        tenantId,
        value: 1, // Count each API call as 1
        properties: {
          ...properties,
          latency_ms: latencyMs,
        },
      });

      logger.debug("[metering:middleware] API call metered", {
        tenantId,
        method: properties.method,
        path: properties.path,
        status: properties.status,
      });
    } catch (error) {
      // Don't fail the request if metering fails
      logger.warn("[metering:middleware] Failed to meter API call", { error });
    }
  };
}

/**
 * Create a middleware that meters specific operations within handlers.
 *
 * @example
 * ```ts
 * export const recordTokenUsage = meterOperation("ai_tokens");
 *
 * app.post("/api/chat", async (c) => {
 *   const metering = await getMetering();
 *   const tenantId = c.get("tenantId");
 *
 *   const response = await callAI("gpt-4", prompt);
 *
 *   await recordTokenUsage(metering, tenantId, response.tokens, {
 *     model: "gpt-4",
 *     endpoint: "/api/chat",
 *   });
 *
 *   return c.json(response);
 * });
 * ```
 */
export function meterOperation(meterId: string) {
  return async (
    provider: MeteringProvider,
    tenantId: string,
    value: number,
    properties?: Record<string, unknown>,
  ) => {
    try {
      await provider.ingest({
        meterId,
        tenantId,
        value,
        properties,
      });

      logger.debug("[metering:middleware] Operation metered", {
        meterId,
        tenantId,
        value,
      });
    } catch (error) {
      logger.error("[metering:middleware] Failed to meter operation", {
        meterId,
        error,
      });
      throw error;
    }
  };
}

/**
 * Helper to create a metering wrapper for async operations.
 *
 * @example
 * ```ts
 * const metering = await getMetering();
 * const withMetering = createMeteringWrapper(metering);
 *
 * // Record a background job
 * await withMetering("job_executed", tenantId, 1, {
 *   job_type: "report_generation",
 *   status: "completed",
 * });
 * ```
 */
export function createMeteringWrapper(provider: MeteringProvider) {
  return async (
    meterId: string,
    tenantId: string,
    value: number,
    properties?: Record<string, unknown>,
  ) => {
    try {
      await provider.ingest({
        meterId,
        tenantId,
        value,
        properties,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error("[metering:wrapper] Failed to record metric", {
        meterId,
        tenantId,
        error,
      });
      throw error;
    }
  };
}
