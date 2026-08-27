import { isPlanFeature, type Plan, requireEntitlementUsage } from "@nebutra/billing";
import { logger } from "@nebutra/logger";
import type { Context, Next } from "hono";

const SUPPORTED_PLANS = new Set<Plan>(["FREE", "PRO", "ENTERPRISE"]);

const FEATURE_METER_MAP: Record<string, string> = {
  "ai.chat": "ai_tokens",
  "ai.embeddings": "ai_tokens",
  "ai.images": "ai_tokens",
  "ai.reasoning": "ai_tokens",
  "api.access": "api_calls",
};

function normalizePlan(plan: string | undefined): Plan {
  const normalized = plan?.toUpperCase();
  return normalized && SUPPORTED_PLANS.has(normalized as Plan) ? (normalized as Plan) : "FREE";
}

function entitlementCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code?: unknown }).code ?? "ENTITLEMENT_DENIED")
    : "ENTITLEMENT_DENIED";
}

function entitlementMessage(error: unknown): string {
  return error instanceof Error ? error.message : "You do not have access to this feature.";
}

function isEntitlementFailure(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { code?: unknown; name?: unknown };
  return (
    candidate.name === "EntitlementError" ||
    candidate.code === "ENTITLEMENT_DENIED" ||
    candidate.code === "USAGE_LIMIT_EXCEEDED"
  );
}

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
      const plan = normalizePlan(tenant.plan);

      if (!isPlanFeature(plan, feature)) {
        logger.warn(`Entitlement denied: ${feature} for org ${tenant.organizationId}`);
        return c.json(
          {
            error: "Payment Required / Forbidden",
            message: `Plan ${plan} does not include ${feature}.`,
            code: "ENTITLEMENT_DENIED",
          },
          402,
        );
      }

      const meterId = FEATURE_METER_MAP[feature];
      if (meterId) {
        await requireEntitlementUsage(tenant.organizationId, meterId, plan, {
          requested: Math.max(0, quantity ?? 0),
        });
      }
    } catch (error: unknown) {
      if (isEntitlementFailure(error)) {
        logger.warn(`Entitlement denied: ${feature} for org ${tenant.organizationId}`);
        return c.json(
          {
            error: "Payment Required / Forbidden",
            message: entitlementMessage(error),
            code: entitlementCode(error),
          },
          402,
        );
      }
      throw error;
    }

    await next();
  };
}
