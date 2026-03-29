/**
 * Tenant-scoped agent execution context.
 *
 * Ensures every agent operation carries tenantId for RLS,
 * billing, and audit trail purposes.
 */

import type { AgentContext } from "./types.js";

/**
 * Create a fully-populated AgentContext.
 * Generates a random conversationId when none is provided.
 */
export function createAgentContext(
  tenantId: string,
  userId: string,
  conversationId?: string,
  metadata?: Record<string, unknown>,
): AgentContext {
  return {
    tenantId,
    userId,
    conversationId: conversationId ?? crypto.randomUUID(),
    ...(metadata !== undefined ? { metadata } : {}),
  };
}

/**
 * Validate that a tenant has remaining quota for agent execution.
 *
 * Returns `{ allowed: true, remaining: -1 }` (unlimited) by default.
 * Integrate with @nebutra/billing entitlements for production usage.
 */
export async function checkAgentQuota(
  _tenantId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  // TODO: integrate with @nebutra/billing entitlements
  return { allowed: true, remaining: -1 };
}
