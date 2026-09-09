import "server-only";

import { getSystemDb } from "@nebutra/db";
import { logger } from "@nebutra/logger";
import { UsageLedgerRepository } from "@nebutra/repositories";
import type { EdgeUsage } from "./openai-edge";

/**
 * Router usage → the Nebutra ledger. The customer balance is Nebutra's, so the
 * ledger row is written here regardless of which engine served the call.
 * Idempotent on request id; never throws into the response path.
 */
export async function recordRouterUsage(usage: EdgeUsage): Promise<void> {
  try {
    await new UsageLedgerRepository(getSystemDb()).claim({
      organizationId: usage.identity.tenantId,
      idempotencyKey: `router:${usage.requestId}`,
      source: "API",
      type: "AI_TOKEN",
      quantity: usage.totalTokens,
      unit: "token",
      resource: usage.model,
      ...(usage.identity.userId ? { userId: usage.identity.userId } : {}),
      metadata: {
        product: "router",
        path: usage.path,
        keyId: usage.identity.keyId,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        status: usage.status,
        latencyMs: usage.latencyMs,
        supplyPath: usage.supplyPath,
      },
    });
  } catch (error) {
    logger.error("[router] usage ledger write failed", {
      requestId: usage.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
