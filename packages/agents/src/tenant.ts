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
  tenantId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const { getCreditBalance } = await import("@nebutra/billing/credits");
    const balance = getCreditBalance(tenantId);

    // Simple quota check: tenant must have positive credits
    // In production, we might check plan-specific monthly limits beforehand
    if (balance.balance > 0) {
      return { allowed: true, remaining: balance.balance };
    }

    return { allowed: false, remaining: 0 };
  } catch (err) {
    // Failsafe open if billing is unconfigured
    return { allowed: true, remaining: -1 };
  }
}
