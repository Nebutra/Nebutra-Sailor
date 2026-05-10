import type { Plan } from "../types";
import { DEFAULT_PLAN_LIMITS, DEFAULT_USAGE_PRICING, EntitlementError } from "../types";
import { getUsage } from "../usage/service";

// ============================================
// Types (kept for public-surface compatibility)
// ============================================
//
// NOTE (schema-orphan-cleanup): The Prisma `Entitlement` model was hard-deleted.
// The interfaces below are retained because downstream callers still reference
// them for type-shaping. The DB-backed CRUD functions below are intentionally
// stubbed — use {@link checkEntitlementUsage} / {@link requireEntitlementUsage}
// (metering-backed) instead.

export interface Entitlement {
  id: string;
  organizationId: string;
  feature: string;
  isEnabled: boolean;
  limitValue?: bigint; // null = unlimited
  usedValue: bigint;
  resetPeriod?: "monthly" | "daily";
  lastResetAt?: Date;
  expiresAt?: Date;
  source: "plan" | "addon" | "trial" | "custom";
  metadata?: Record<string, unknown>;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  feature: string;
  reason?: string;
  limit?: bigint;
  used?: bigint;
  remaining?: bigint;
}

export interface GrantEntitlementInput {
  organizationId: string;
  feature: string;
  limitValue?: number;
  resetPeriod?: "monthly" | "daily";
  expiresAt?: Date;
  source: "plan" | "addon" | "trial" | "custom";
  metadata?: Record<string, unknown>;
}

// ============================================
// Feature Definitions
// ============================================

export const FEATURES = {
  // AI Features
  "ai.chat": { name: "AI Chat", description: "Access to AI chat features" },
  "ai.embeddings": { name: "Embeddings", description: "Generate text embeddings" },
  "ai.images": { name: "Image Generation", description: "Generate images with AI" },
  "ai.reasoning": { name: "AI Reasoning", description: "Access to reasoning models" },

  // Content Features
  "content.create": { name: "Content Creation", description: "Create content" },
  "content.publish": { name: "Content Publishing", description: "Publish content" },
  "content.analytics": { name: "Content Analytics", description: "View content analytics" },

  // Recommendations
  "recommendations.basic": {
    name: "Basic Recommendations",
    description: "Basic recommendation features",
  },
  "recommendations.advanced": {
    name: "Advanced Recommendations",
    description: "Advanced ML-based recommendations",
  },

  // Web3 Features
  "web3.nft": { name: "NFT Features", description: "NFT minting and management" },
  "web3.wallet": { name: "Wallet Integration", description: "Web3 wallet integration" },

  // Team Features
  "team.members": { name: "Team Members", description: "Add team members" },
  "team.roles": { name: "Custom Roles", description: "Create custom roles" },

  // Platform Features
  "api.access": { name: "API Access", description: "Direct API access" },
  webhooks: { name: "Webhooks", description: "Configure webhooks" },
  sso: { name: "SSO/SAML", description: "Single sign-on integration" },
  audit_logs: { name: "Audit Logs", description: "View audit logs" },
} as const;

export type FeatureKey = keyof typeof FEATURES;

// ============================================
// Plan Feature Mapping
// ============================================

export const PLAN_FEATURES: Record<Plan, FeatureKey[]> = {
  FREE: ["ai.chat", "content.create", "recommendations.basic"],
  PRO: [
    "ai.chat",
    "ai.embeddings",
    "ai.images",
    "content.create",
    "content.publish",
    "content.analytics",
    "recommendations.basic",
    "recommendations.advanced",
    "team.members",
    "api.access",
    "webhooks",
  ],
  ENTERPRISE: [
    "ai.chat",
    "ai.embeddings",
    "ai.images",
    "ai.reasoning",
    "content.create",
    "content.publish",
    "content.analytics",
    "recommendations.basic",
    "recommendations.advanced",
    "web3.nft",
    "web3.wallet",
    "team.members",
    "team.roles",
    "api.access",
    "webhooks",
    "sso",
    "audit_logs",
  ],
};

// ============================================
// DEPRECATED DB-Backed Entitlement API
// ============================================
//
// The `Entitlement` Prisma model has been deleted as part of the schema
// orphan cleanup. All CRUD helpers below throw {@link EntitlementError} —
// callers must migrate to the metering-backed API:
//
//     checkEntitlementUsage(organizationId, meterId, plan)
//     requireEntitlementUsage(organizationId, meterId, plan)
//
// `requireEntitlement(feature)` is retained as a no-op pass-through so that
// existing middleware does not break at runtime; feature gating should be
// expressed through `PLAN_FEATURES` + `isPlanFeature` until a full entitlement
// store is reintroduced.

const DEPRECATION_MESSAGE =
  "Entitlement DB CRUD is deprecated (Entitlement model removed). " +
  "Use checkEntitlementUsage() / requireEntitlementUsage() (metering-backed) " +
  "or the plan-level helpers PLAN_FEATURES + isPlanFeature().";

export function invalidateCache(_organizationId: string): void {
  // No-op — legacy cache removed together with the Entitlement table.
}

export async function getEntitlements(_organizationId: string): Promise<Entitlement[]> {
  throw new EntitlementError(DEPRECATION_MESSAGE, "ENTITLEMENT_DEPRECATED");
}

/**
 * @deprecated See {@link DEPRECATION_MESSAGE}. Prefer plan-level feature gating
 * via {@link isPlanFeature} or metered checks via {@link checkEntitlementUsage}.
 *
 * Returns `{ allowed: true }` unconditionally so that callers that have not yet
 * migrated continue to function. Quantity-based quota checks will silently pass.
 */
export async function checkEntitlement(
  _organizationId: string,
  feature: string,
  _quantity?: number,
): Promise<EntitlementCheckResult> {
  return {
    allowed: true,
    feature,
  };
}

/**
 * @deprecated See {@link DEPRECATION_MESSAGE}. Retained as a no-op for backward
 * compatibility with existing Hono middleware. Does not enforce any quota or
 * feature gate — migrate call sites to {@link requireEntitlementUsage}.
 */
export async function requireEntitlement(
  _organizationId: string,
  _feature: string,
  _quantity?: number,
): Promise<void> {
  // No-op: cannot enforce without an entitlement store.
}

export async function grantEntitlement(_input: GrantEntitlementInput): Promise<Entitlement> {
  throw new EntitlementError(DEPRECATION_MESSAGE, "ENTITLEMENT_DEPRECATED");
}

export async function revokeEntitlement(_organizationId: string, _feature: string): Promise<void> {
  throw new EntitlementError(DEPRECATION_MESSAGE, "ENTITLEMENT_DEPRECATED");
}

export async function incrementUsage(
  _organizationId: string,
  _feature: string,
  _quantity: number = 1,
): Promise<void> {
  throw new EntitlementError(DEPRECATION_MESSAGE, "ENTITLEMENT_DEPRECATED");
}

export async function resetUsage(_organizationId: string, _feature: string): Promise<void> {
  throw new EntitlementError(DEPRECATION_MESSAGE, "ENTITLEMENT_DEPRECATED");
}

export async function initializePlanEntitlements(
  _organizationId: string,
  _plan: Plan,
): Promise<Entitlement[]> {
  throw new EntitlementError(DEPRECATION_MESSAGE, "ENTITLEMENT_DEPRECATED");
}

/**
 * Check if a feature is available in a plan
 */
export function isPlanFeature(plan: Plan, feature: string): boolean {
  const features = PLAN_FEATURES[plan] || [];
  return features.includes(feature as FeatureKey);
}

// ============================================
// Plan-level usage entitlement (metering-backed)
// ============================================

/**
 * Meter IDs (from `@nebutra/metering`) → plan limit fields.
 *
 * Expressed as a plain object so that new meters can be registered without
 * touching `checkEntitlementUsage` itself. Keys must match the `id` field
 * of the corresponding `MeterDefinition`.
 */
export const METER_TO_PLAN_LIMIT: Record<string, keyof (typeof DEFAULT_PLAN_LIMITS)["FREE"]> = {
  ai_tokens: "aiTokens",
  api_calls: "apiCalls",
  storage_bytes: "storage",
};

export interface UsageEntitlementResult {
  allowed: boolean;
  meterId: string;
  plan: Plan;
  used: number;
  /** Plan limit. `-1` means unlimited (ENTERPRISE). */
  limit: number;
  /** Remaining quota (`Infinity` when `limit === -1`). */
  remaining: number;
  reason?: string;
}

/**
 * Check whether a metered feature is within the plan's usage limit.
 *
 * Pulls **live usage** from the metering pipeline and compares it against the
 * plan's configured limit. This is the canonical replacement for the deleted
 * DB-backed entitlement store:
 *
 *     AI call → metering.ingest("ai_tokens", org, N)   [ClickHouse write]
 *             → getUsage(org, "ai_tokens", { period: "monthly" })
 *             → checkEntitlementUsage(org, "ai_tokens", plan)
 *
 * Returns `{ allowed: false }` when usage has reached or exceeded the plan
 * limit. Returns `{ allowed: true, limit: -1 }` for unlimited plans.
 *
 * @throws when the meter is not recognised in {@link METER_TO_PLAN_LIMIT}.
 */
export async function checkEntitlementUsage(
  organizationId: string,
  meterId: string,
  plan: Plan,
): Promise<UsageEntitlementResult> {
  const limitField = METER_TO_PLAN_LIMIT[meterId];
  if (!limitField) {
    throw new EntitlementError(
      `No plan limit mapping for meter '${meterId}'. Register it in METER_TO_PLAN_LIMIT.`,
      "UNKNOWN_METER",
    );
  }

  const limit = DEFAULT_PLAN_LIMITS[plan][limitField] as number;
  const used = await getUsage(organizationId, meterId, { period: "monthly" });

  // Unlimited plan (-1) → always allowed
  if (limit === -1) {
    return {
      allowed: true,
      meterId,
      plan,
      used,
      limit: -1,
      remaining: Number.POSITIVE_INFINITY,
    };
  }

  const remaining = Math.max(0, limit - used);
  const allowed = used < limit;

  return {
    allowed,
    meterId,
    plan,
    used,
    limit,
    remaining,
    ...(allowed ? {} : { reason: `${meterId} limit exceeded (${used}/${limit})` }),
  };
}

/**
 * Require a metered entitlement to be within limits — throws otherwise.
 */
export async function requireEntitlementUsage(
  organizationId: string,
  meterId: string,
  plan: Plan,
): Promise<void> {
  const result = await checkEntitlementUsage(organizationId, meterId, plan);
  if (!result.allowed) {
    throw new EntitlementError(result.reason ?? "Usage limit exceeded", "USAGE_LIMIT_EXCEEDED");
  }
}

// Keep legacy helper for consumers that still reference it. `DEFAULT_USAGE_PRICING`
// is the source of truth for monetary price per unit; `METER_TO_PLAN_LIMIT`
// handles the meter-id → limit-field mapping used above.
void DEFAULT_USAGE_PRICING;
