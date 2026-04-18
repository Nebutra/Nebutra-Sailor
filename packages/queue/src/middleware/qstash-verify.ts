import { logger } from "@nebutra/logger";
import { Receiver } from "@upstash/qstash";
import { getQStashHandler } from "../providers/qstash";
import type { JobPayload } from "../types";

// =============================================================================
// QStash Webhook Verification Middleware
// =============================================================================
// When QStash delivers a message to your API, it signs the request.
// This middleware verifies that signature so you can trust the payload.
//
// Mount this in your Hono / Express / Next.js API route:
//
//   POST /api/queue/:queue/:type
//
// Usage with Hono (api-gateway):
//
//   import { createQStashWebhookHandler } from "@nebutra/queue";
//
//   app.post("/api/queue/:queue/:type", async (c) => {
//     const handler = createQStashWebhookHandler();
//     return handler(c.req.raw);
//   });
// =============================================================================

interface QStashVerifyOptions {
  /** Current signing key (defaults to `process.env.QSTASH_CURRENT_SIGNING_KEY`) */
  currentSigningKey?: string;
  /** Next signing key for key rotation (defaults to `process.env.QSTASH_NEXT_SIGNING_KEY`) */
  nextSigningKey?: string;
}

/**
 * Creates a request handler that:
 * 1. Verifies the QStash signature
 * 2. Parses the job payload
 * 3. Routes to the registered handler
 * 4. Returns 200 on success, 500 on failure (triggers QStash retry)
 */
export function createQStashWebhookHandler(options?: QStashVerifyOptions) {
  const currentSigningKey =
    options?.currentSigningKey ?? process.env.QSTASH_CURRENT_SIGNING_KEY ?? "";
  const nextSigningKey = options?.nextSigningKey ?? process.env.QSTASH_NEXT_SIGNING_KEY ?? "";

  const receiver =
    currentSigningKey && nextSigningKey
      ? new Receiver({ currentSigningKey, nextSigningKey })
      : null;

  return async (request: Request): Promise<Response> => {
    const body = await request.text();

    // ── Signature verification ──────────────────────────────────────────
    if (receiver) {
      try {
        const signature = request.headers.get("upstash-signature") ?? "";
        const isValid = await receiver.verify({
          signature,
          body,
        });

        if (!isValid) {
          logger.warn("[queue:qstash-verify] Invalid signature");
          return new Response("Unauthorized", { status: 401 });
        }
      } catch (error) {
        logger.error("[queue:qstash-verify] Signature verification failed", {
          error: error instanceof Error ? error.message : String(error),
        });
        return new Response("Unauthorized", { status: 401 });
      }
    } else {
      logger.warn(
        "[queue:qstash-verify] No signing keys configured — skipping verification (dev mode)",
      );
    }

    // ── Parse payload ───────────────────────────────────────────────────
    let payload: JobPayload;
    try {
      payload = JSON.parse(body) as JobPayload;
    } catch {
      logger.error("[queue:qstash-verify] Invalid JSON payload");
      return new Response("Bad Request", { status: 400 });
    }

    // ── Route to handler ────────────────────────────────────────────────
    const handler = getQStashHandler(payload.queue, payload.type);
    if (!handler) {
      logger.warn("[queue:qstash-verify] No handler for job", {
        queue: payload.queue,
        type: payload.type,
      });
      // Return 200 to prevent infinite retries for unregistered handlers
      return new Response("No handler registered", { status: 200 });
    }

    try {
      await handler(payload);

      logger.info("[queue:qstash-verify] Job processed successfully", {
        jobId: payload.id,
        queue: payload.queue,
        type: payload.type,
      });

      return new Response("OK", { status: 200 });
    } catch (error) {
      logger.error("[queue:qstash-verify] Job processing failed", {
        jobId: payload.id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return 500 so QStash retries the delivery
      return new Response("Internal Server Error", { status: 500 });
    }
  };
}
