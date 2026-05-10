/**
 * PlanConfigService
 *
 * Database-driven plan configuration with Redis caching
 * Supports:
 * - Dynamic plan/feature/limit configuration
 * - Customer-level overrides
 * - Plan versioning (grandfathering)
 * - Multi-tenant caching
 */

import type { PrismaClient } from "@nebutra/db";

// ============================================
// Types
// ============================================

export interface PlanConfig {
  id: string;
  slug: string;
  name: string;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  version: string;
  interval: "MONTHLY" | "YEARLY" | "ONE_TIME";
  amount: number;
  currency: string;
  trialDays: number;
  features: Record<string, FeatureValue>;
  limits: Record<string, LimitConfig>;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

export interface FeatureValue {
  enabled: boolean;
  value: unknown;
  metadata?: Record<string, unknown>;
}

export interface LimitConfig {
  limit: number; // -1 = unlimited
  unit: string;
  resetPeriod: "monthly" | "daily" | "never";
  overageRate: number | null;
}

export interface ResolvedConfig {
  plan: PlanConfig;
  features: Record<string, FeatureValue>;
  limits: Record<string, LimitConfig>;
  overrides: {
    planVersion: string | null;
    features: string[];
    limits: string[];
  };
}

export interface CacheAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern: string): Promise<string[]>;
}

// ============================================
// In-Memory Cache (fallback)
// ============================================

class InMemoryCache implements CacheAdapter {
  private cache = new Map<string, { value: string; expiresAt: number }>();

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace("*", ".*"));
    return Array.from(this.cache.keys()).filter((k) => regex.test(k));
  }
}

// ============================================
// PlanConfigService
// ============================================

export class PlanConfigService {
  private prisma: PrismaClient;
  private cache: CacheAdapter;
  private cacheTTL: number;
  private cachePrefix: string;

  // Singleton instance
  private static instance: PlanConfigService | null = null;

  constructor(options: {
    prisma: PrismaClient;
    cache?: CacheAdapter;
    cacheTTL?: number;
    cachePrefix?: string;
  }) {
    this.prisma = options.prisma;
    this.cache = options.cache ?? new InMemoryCache();
    this.cacheTTL = options.cacheTTL ?? 300; // 5 minutes default
    this.cachePrefix = options.cachePrefix ?? "billing:config:";
  }

  /**
   * Initialize singleton instance
   */
  static init(options: {
    prisma: PrismaClient;
    cache?: CacheAdapter;
    cacheTTL?: number;
  }): PlanConfigService {
    PlanConfigService.instance = new PlanConfigService(options);
    return PlanConfigService.instance;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PlanConfigService {
    if (!PlanConfigService.instance) {
      throw new Error("PlanConfigService not initialized. Call init() first.");
    }
    return PlanConfigService.instance;
  }

  // ============================================
  // Core Methods
  // ============================================

  /**
   * Get resolved configuration for an organization
   * Merges: Plan defaults → Customer overrides
   */
  async getConfig(organizationId: string): Promise<ResolvedConfig> {
    const cacheKey = `${this.cachePrefix}org:${organizationId}`;

    // Try cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Get organization's subscription to find their plan
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: { in: ["ACTIVE", "TRIALING"] },
      },
      include: {
        pricingPlan: {
          include: {
            planFeatures: {
              include: { feature: true },
            },
            planLimits: {
              include: { limitDef: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Check for grandfathered plan version
    const planVersion = await this.prisma.customerPlanVersion.findUnique({
      where: { organizationId },
      include: {
        plan: {
          include: {
            planFeatures: { include: { feature: true } },
            planLimits: { include: { limitDef: true } },
          },
        },
      },
    });

    // Use grandfathered plan if exists and not expired
    const effectivePlan =
      planVersion?.plan && (!planVersion.expiresAt || planVersion.expiresAt > new Date())
        ? planVersion.plan
        : subscription?.pricingPlan;

    // Default to free plan if no subscription
    const plan = effectivePlan ?? (await this.getFreePlan());

    // Build base config from plan
    const features = this.buildFeaturesFromPlan(plan);
    const limits = this.buildLimitsFromPlan(plan);

    // Apply customer overrides
    const [featureOverrides, limitOverrides] = await Promise.all([
      this.prisma.customerFeatureOverride.findMany({
        where: {
          organizationId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
      }),
      this.prisma.customerUsageLimit.findMany({
        where: {
          organizationId,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: { limitDef: true },
      }),
    ]);

    // Apply feature overrides
    const overriddenFeatures: string[] = [];
    for (const override of featureOverrides) {
      features[override.featureKey] = {
        enabled: Boolean(override.value),
        value: override.value,
        metadata: { overrideReason: override.reason },
      };
      overriddenFeatures.push(override.featureKey);
    }

    // Apply limit overrides
    const overriddenLimits: string[] = [];
    for (const override of limitOverrides) {
      limits[override.limitDef.key] = {
        limit: Number(override.limitValue),
        unit: override.limitDef.unit,
        resetPeriod: override.limitDef.resetPeriod as "monthly" | "daily" | "never",
        overageRate: override.overageRate
          ? Number(override.overageRate)
          : (limits[override.limitDef.key]?.overageRate ?? null),
      };
      overriddenLimits.push(override.limitDef.key);
    }

    const config: ResolvedConfig = {
      plan: this.formatPlanConfig(plan),
      features,
      limits,
      overrides: {
        planVersion: planVersion ? plan.version : null,
        features: overriddenFeatures,
        limits: overriddenLimits,
      },
    };

    // Cache the result
    await this.cache.set(cacheKey, JSON.stringify(config), this.cacheTTL);

    return config;
  }

  /**
   * Get plan by slug (e.g., "pro", "enterprise")
   */
  async getPlan(slug: string, version?: string): Promise<PlanConfig | null> {
    const cacheKey = `${this.cachePrefix}plan:${slug}:${version ?? "latest"}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const plan = await this.prisma.pricingPlan.findFirst({
      where: {
        slug,
        isActive: true,
        ...(version ? { version } : {}),
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      include: {
        planFeatures: { include: { feature: true } },
        planLimits: { include: { limitDef: true } },
      },
      orderBy: { effectiveFrom: "desc" },
    });

    if (!plan) return null;

    const config = this.formatPlanConfig(plan);
    await this.cache.set(cacheKey, JSON.stringify(config), this.cacheTTL);

    return config;
  }

  /**
   * Get all active plans
   */
  async getPlans(options?: { publicOnly?: boolean }): Promise<PlanConfig[]> {
    const cacheKey = `${this.cachePrefix}plans:${options?.publicOnly ? "public" : "all"}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const plans = await this.prisma.pricingPlan.findMany({
      where: {
        isActive: true,
        ...(options?.publicOnly ? { isPublic: true } : {}),
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: new Date() } }],
      },
      include: {
        planFeatures: { include: { feature: true } },
        planLimits: { include: { limitDef: true } },
      },
      orderBy: [{ plan: "asc" }, { effectiveFrom: "desc" }],
    });

    // Deduplicate by slug (keep latest version)
    const uniquePlans = new Map<string, (typeof plans)[0]>();
    for (const plan of plans) {
      if (!uniquePlans.has(plan.slug)) {
        uniquePlans.set(plan.slug, plan);
      }
    }

    const configs = Array.from(uniquePlans.values()).map((p) => this.formatPlanConfig(p));
    await this.cache.set(cacheKey, JSON.stringify(configs), this.cacheTTL);

    return configs;
  }

  /**
   * Check if organization has feature access
   */
  async hasFeature(organizationId: string, featureKey: string): Promise<boolean> {
    const config = await this.getConfig(organizationId);
    return config.features[featureKey]?.enabled ?? false;
  }

  /**
   * Get usage limit for organization
   */
  async getLimit(organizationId: string, limitKey: string): Promise<LimitConfig | null> {
    const config = await this.getConfig(organizationId);
    return config.limits[limitKey] ?? null;
  }

  /**
   * Check if usage is within limits
   */
  async checkLimit(
    organizationId: string,
    limitKey: string,
    currentUsage: number,
    additionalUsage = 0,
  ): Promise<{
    allowed: boolean;
    limit: number;
    current: number;
    remaining: number;
    wouldExceed: boolean;
  }> {
    const limitConfig = await this.getLimit(organizationId, limitKey);

    if (!limitConfig) {
      return {
        allowed: false,
        limit: 0,
        current: currentUsage,
        remaining: 0,
        wouldExceed: true,
      };
    }

    // -1 means unlimited
    if (limitConfig.limit === -1) {
      return {
        allowed: true,
        limit: -1,
        current: currentUsage,
        remaining: -1,
        wouldExceed: false,
      };
    }

    const remaining = limitConfig.limit - currentUsage;
    const wouldExceed = currentUsage + additionalUsage > limitConfig.limit;

    return {
      allowed: !wouldExceed,
      limit: limitConfig.limit,
      current: currentUsage,
      remaining: Math.max(0, remaining),
      wouldExceed,
    };
  }

  // ============================================
  // Cache Management
  // ============================================

  /**
   * Invalidate cache for organization
   */
  async invalidateOrg(organizationId: string): Promise<void> {
    const cacheKey = `${this.cachePrefix}org:${organizationId}`;
    await this.cache.del(cacheKey);
  }

  /**
   * Invalidate all plan caches
   */
  async invalidatePlans(): Promise<void> {
    const keys = await this.cache.keys(`${this.cachePrefix}plan:*`);
    for (const key of keys) {
      await this.cache.del(key);
    }
    await this.cache.del(`${this.cachePrefix}plans:public`);
    await this.cache.del(`${this.cachePrefix}plans:all`);
  }

  /**
   * Invalidate all caches
   */
  async invalidateAll(): Promise<void> {
    const keys = await this.cache.keys(`${this.cachePrefix}*`);
    for (const key of keys) {
      await this.cache.del(key);
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async getFreePlan() {
    const plan = await this.prisma.pricingPlan.findFirst({
      where: {
        plan: "FREE",
        isActive: true,
      },
      include: {
        planFeatures: { include: { feature: true } },
        planLimits: { include: { limitDef: true } },
      },
    });

    if (!plan) {
      // Return hardcoded fallback
      return {
        id: "default-free",
        slug: "free",
        name: "Free",
        plan: "FREE" as const,
        version: "v1",
        interval: "MONTHLY" as const,
        amount: 0,
        currency: "USD",
        trialDays: 0,
        effectiveFrom: new Date(),
        effectiveTo: null,
        isActive: true,
        isPublic: true,
        planFeatures: [],
        planLimits: [],
      };
    }

    return plan;
  }

  private buildFeaturesFromPlan(plan: {
    planFeatures: Array<{
      feature: { key: string };
      value: unknown;
      isEnabled: boolean;
      metadata: unknown;
    }>;
  }): Record<string, FeatureValue> {
    const features: Record<string, FeatureValue> = {};

    for (const pf of plan.planFeatures) {
      features[pf.feature.key] = {
        enabled: pf.isEnabled,
        value: pf.value,
        metadata: (pf.metadata as Record<string, unknown>) ?? undefined,
      };
    }

    return features;
  }

  private buildLimitsFromPlan(plan: {
    planLimits: Array<{
      limitDef: {
        key: string;
        unit: string;
        resetPeriod: string;
        overageRate: unknown;
      };
      limitValue: bigint;
      overageRate: unknown;
    }>;
  }): Record<string, LimitConfig> {
    const limits: Record<string, LimitConfig> = {};

    for (const pl of plan.planLimits) {
      limits[pl.limitDef.key] = {
        limit: Number(pl.limitValue),
        unit: pl.limitDef.unit,
        resetPeriod: pl.limitDef.resetPeriod as "monthly" | "daily" | "never",
        overageRate: pl.overageRate
          ? Number(pl.overageRate)
          : pl.limitDef.overageRate
            ? Number(pl.limitDef.overageRate)
            : null,
      };
    }

    return limits;
  }

  private formatPlanConfig(plan: {
    id: string;
    slug: string;
    name: string;
    plan: string;
    version: string;
    interval: string;
    amount: unknown;
    currency: string;
    trialDays: number;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    isActive: boolean;
    planFeatures: Array<{
      feature: { key: string };
      value: unknown;
      isEnabled: boolean;
      metadata: unknown;
    }>;
    planLimits: Array<{
      limitDef: {
        key: string;
        unit: string;
        resetPeriod: string;
        overageRate: unknown;
      };
      limitValue: bigint;
      overageRate: unknown;
    }>;
  }): PlanConfig {
    return {
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      plan: plan.plan as "FREE" | "PRO" | "ENTERPRISE",
      version: plan.version,
      interval: plan.interval as "MONTHLY" | "YEARLY" | "ONE_TIME",
      amount: Number(plan.amount),
      currency: plan.currency,
      trialDays: plan.trialDays,
      features: this.buildFeaturesFromPlan(plan),
      limits: this.buildLimitsFromPlan(plan),
      isActive: plan.isActive,
      effectiveFrom: plan.effectiveFrom,
      effectiveTo: plan.effectiveTo,
    };
  }
}

// ============================================
// Exports
// ============================================

export const initPlanConfig = PlanConfigService.init.bind(PlanConfigService);
export const getPlanConfig = () => PlanConfigService.getInstance();
