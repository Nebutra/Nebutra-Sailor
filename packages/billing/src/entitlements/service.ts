import { getTenantDb } from "@nebutra/db";
import type { Plan } from "../types.js";
import { DEFAULT_PLAN_LIMITS, EntitlementError } from "../types.js";

// ============================================
// Types
// ============================================

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
// Database & Cache Layer
// ============================================

const CACHE_TTL_MS = 60 * 1000;
interface CacheEntry {
  data: Entitlement[];
  expiresAt: number;
}
const l1Cache = new Map<string, CacheEntry>();

export async function getEntitlements(organizationId: string): Promise<Entitlement[]> {
  const now = Date.now();
  const cached = l1Cache.get(organizationId);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const dbEntitlements = await getTenantDb(organizationId).entitlement.findMany({
    where: { organizationId },
  });

  const parsed = dbEntitlements.map((e) => ({
    id: e.id,
    organizationId: e.organizationId,
    feature: e.feature,
    isEnabled: e.isEnabled,
    limitValue: e.limitValue !== null ? e.limitValue : undefined,
    usedValue: e.usedValue,
    resetPeriod: (e.resetPeriod as "monthly" | "daily") || undefined,
    lastResetAt: e.lastResetAt || undefined,
    expiresAt: e.expiresAt || undefined,
    source: (e.source as "plan" | "addon" | "trial" | "custom"),
    metadata: (e.metadata as Record<string, unknown>) || undefined,
  }));

  try {
    const cacheModule = await import("@nebutra/cache").catch(() => null);
    if (cacheModule) {
      // Opt: try redis here if supported securely
    }
  } catch (err) {}

  l1Cache.set(organizationId, {
    data: parsed,
    expiresAt: now + CACHE_TTL_MS,
  });

  return parsed;
}

export function invalidateCache(organizationId: string) {
  l1Cache.delete(organizationId);
}

/**
 * Check if an organization has access to a feature
 */
export async function checkEntitlement(
  organizationId: string,
  feature: string,
  quantity?: number,
): Promise<EntitlementCheckResult> {
  const orgEntitlements = await getEntitlements(organizationId);
  const entitlement = orgEntitlements.find((e) => e.feature === feature);

  // No entitlement found
  if (!entitlement) {
    return {
      allowed: false,
      feature,
      reason: "Feature not available in your plan",
    };
  }

  // Check if enabled
  if (!entitlement.isEnabled) {
    return {
      allowed: false,
      feature,
      reason: "Feature is disabled",
    };
  }

  // Check expiration
  if (entitlement.expiresAt && entitlement.expiresAt < new Date()) {
    return {
      allowed: false,
      feature,
      reason: "Feature has expired",
    };
  }

  // Check limit if specified
  if (entitlement.limitValue !== undefined && quantity) {
    const remaining = entitlement.limitValue - entitlement.usedValue;
    if (remaining < BigInt(quantity)) {
      return {
        allowed: false,
        feature,
        reason: "Usage limit exceeded",
        limit: entitlement.limitValue,
        used: entitlement.usedValue,
        remaining,
      };
    }
  }

  return {
    allowed: true,
    feature,
    limit: entitlement.limitValue,
    used: entitlement.usedValue,
    remaining: entitlement.limitValue ? entitlement.limitValue - entitlement.usedValue : undefined,
  };
}

/**
 * Require an entitlement - throws if not allowed
 */
export async function requireEntitlement(
  organizationId: string,
  feature: string,
  quantity?: number,
): Promise<void> {
  const result = await checkEntitlement(organizationId, feature, quantity);

  if (!result.allowed) {
    throw new EntitlementError(result.reason || "Access denied", "ENTITLEMENT_DENIED");
  }
}

/**
 * Grant an entitlement to an organization
 */
export async function grantEntitlement(input: GrantEntitlementInput): Promise<Entitlement> {
  const model = await getTenantDb(input.organizationId).entitlement.upsert({
    where: {
      organizationId_feature: { organizationId: input.organizationId, feature: input.feature },
    },
    create: {
      organizationId: input.organizationId,
      feature: input.feature,
      isEnabled: true,
      limitValue: input.limitValue !== undefined ? BigInt(input.limitValue) : null,
      usedValue: BigInt(0),
      resetPeriod: input.resetPeriod,
      expiresAt: input.expiresAt,
      source: input.source,
      metadata: (input.metadata || {}) as any,
    },
    update: {
      isEnabled: true,
      limitValue: input.limitValue !== undefined ? BigInt(input.limitValue) : null,
      resetPeriod: input.resetPeriod,
      expiresAt: input.expiresAt,
      source: input.source,
      metadata: (input.metadata || {}) as any,
    },
  });

  invalidateCache(input.organizationId);

  return {
    id: model.id,
    organizationId: model.organizationId,
    feature: model.feature,
    isEnabled: model.isEnabled,
    limitValue: model.limitValue !== null ? model.limitValue : undefined,
    usedValue: model.usedValue,
    resetPeriod: (model.resetPeriod as "monthly" | "daily") || undefined,
    expiresAt: model.expiresAt || undefined,
    source: (model.source as "plan" | "addon" | "trial" | "custom"),
    metadata: (model.metadata as Record<string, unknown>) || {},
  };
}

/**
 * Revoke an entitlement from an organization
 */
export async function revokeEntitlement(organizationId: string, feature: string): Promise<void> {
  await getTenantDb(organizationId).entitlement.deleteMany({
    where: { organizationId, feature },
  });
  invalidateCache(organizationId);
}

/**
 * Increment usage for a feature
 */
export async function incrementUsage(
  organizationId: string,
  feature: string,
  quantity: number = 1,
): Promise<void> {
  await getTenantDb(organizationId).entitlement.updateMany({
    where: { organizationId, feature },
    data: { usedValue: { increment: BigInt(quantity) } },
  });
  invalidateCache(organizationId);
}

/**
 * Reset usage for a feature
 */
export async function resetUsage(organizationId: string, feature: string): Promise<void> {
  await getTenantDb(organizationId).entitlement.updateMany({
    where: { organizationId, feature },
    data: { usedValue: BigInt(0), lastResetAt: new Date() },
  });
  invalidateCache(organizationId);
}


/**
 * Initialize entitlements for a plan
 */
export async function initializePlanEntitlements(organizationId: string, plan: Plan): Promise<Entitlement[]> {
  const features = PLAN_FEATURES[plan] || [];
  const limits = DEFAULT_PLAN_LIMITS[plan];

  const granted: Entitlement[] = [];

  for (const feature of features) {
    const entitlement = await grantEntitlement({
      organizationId,
      feature,
      source: "plan",
    });
    granted.push(entitlement);
  }

  // Add usage-based entitlements with limits
  if (limits.apiCalls !== -1) {
    const apiEntitlement = await grantEntitlement({
      organizationId,
      feature: "api.calls",
      limitValue: limits.apiCalls,
      resetPeriod: "monthly",
      source: "plan",
    });
    granted.push(apiEntitlement);
  }

  if (limits.aiTokens !== -1) {
    const tokenEntitlement = await grantEntitlement({
      organizationId,
      feature: "ai.tokens",
      limitValue: limits.aiTokens,
      resetPeriod: "monthly",
      source: "plan",
    });
    granted.push(tokenEntitlement);
  }

  return granted;
}

/**
 * Check if a feature is available in a plan
 */
export function isPlanFeature(plan: Plan, feature: string): boolean {
  const features = PLAN_FEATURES[plan] || [];
  return features.includes(feature as FeatureKey);
}
