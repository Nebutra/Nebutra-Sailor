import { logger } from "@nebutra/logger";
import { createQStashWebhookHandler } from "@nebutra/queue";
import { ensureExportWorker, getExportRuntime } from "@/app/api/account/export/_service";

/**
 * QStash delivery endpoint.
 *
 * `QStashProvider.enqueue()` publishes to `${callbackBaseUrl}/api/queue/:queue/:type`,
 * so this is where enqueued jobs are actually executed. The middleware verifies
 * the Upstash signature, then dispatches to the handler registered for
 * `queue:type` in this process — which is why every handler this app owns must
 * be registered before the dispatch, not at enqueue time only.
 *
 * Unknown job types answer 200 (see the middleware) so QStash stops retrying
 * something no deployment can process.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    ensureExportWorker(await getExportRuntime());
  } catch (error) {
    logger.error("[queue] Failed to register job handlers", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return new Response("Queue handlers unavailable", { status: 503 });
  }

  return createQStashWebhookHandler()(request);
}
