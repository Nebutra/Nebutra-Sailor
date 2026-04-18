import { requireEntitlement } from "@nebutra/billing";
import { logger } from "@nebutra/logger";
import type { Context, Next } from "hono";

/**
 * Require a specific feature entitlement.
 * Enforces billing restrictions based on the organization's plan and usage quotas.
 *
 * @example
 * app.post("/api/v1/ai/generate", requireFeature("ai.images", 1), ...);
 */
export function requireFeature(feature: string, quantity?: number) {
  return async (c: Context, next: Next) => {
    const tenant = c.get("tenant");

    if (!tenant?.organizationId) {
      return c.json(
        { error: "Forbidden", message: "Organization membership required to access this feature" },
        403,
      );
    }

    try {
      // In a real application, ensure initializePlanEntitlements has been
      // called prior to this, usually on tenant creation or session resolution.
      await requireEntitlement(tenant.organizationId, feature, quantity);
    } catch (error: any) {
      if (error?.name === "EntitlementError" || error?.code === "ENTITLEMENT_DENIED") {
        logger.warn(`Entitlement denied: ${feature} for org ${tenant.organizationId}`);
        return c.json(
          {
            error: "Payment Required / Forbidden",
            message: error.message || "You do not have access to this feature.",
            code: "ENTITLEMENT_DENIED",
          },
          402, // 402 Payment Required is semantically accurate for quota/plan blocks
        );
      }
      throw error;
    }

    await next();
  };
}
