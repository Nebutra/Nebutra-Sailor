/**
 * Feature Flags - Lightweight abstraction for feature toggles
 *
 * MVP: Simple in-memory/env-based flags
 * Future: Can swap to LaunchDarkly, Unleash, PostHog, etc.
 */

export interface FeatureFlagContext {
  userId?: string;
  tenantId?: string;
  plan?: "free" | "pro" | "enterprise";
  environment?: string;
  percentage?: number; // For gradual rollout
}

export interface FeatureFlagProvider {
  isEnabled: (flag: string, context?: FeatureFlagContext) => Promise<boolean>;
  getVariant: <T>(flag: string, defaultValue: T, context?: FeatureFlagContext) => Promise<T>;
}

export interface FeatureFlagProviderAdapter {
  isEnabled: (flag: string, context?: FeatureFlagContext) => boolean | Promise<boolean>;
  getVariant?: <T>(flag: string, defaultValue: T, context?: FeatureFlagContext) => T | Promise<T>;
}

export interface MemoryFlagRule {
  enabled: boolean;
  rolloutPercentage?: number;
  variants?: Record<string, unknown>;
}

type MemoryFlagValue = boolean | MemoryFlagRule;

export function createFeatureFlagProviderAdapter(
  adapter: FeatureFlagProviderAdapter,
): FeatureFlagProvider {
  return {
    isEnabled: async (flag, context) => Boolean(await adapter.isEnabled(flag, context)),
    getVariant: async (flag, defaultValue, context) => {
      if (!adapter.getVariant) return defaultValue;
      return adapter.getVariant(flag, defaultValue, context);
    },
  };
}

import { getRedis } from "@nebutra/cache";

// ============================================
// Default: Cached Provider with Env Fallback
// ============================================

const CACHE_TTL = 10; // 10 seconds

const dbProvider: FeatureFlagProvider = {
  isEnabled: async (flag: string, _context?: FeatureFlagContext) => {
    // 1. HARD KILL SWITCH: Check env var first (Process context)
    const envKey = `KILL_SWITCH_${flag.toUpperCase().replace(/-/g, "_")}`;
    const envValue = process.env[envKey];
    if (envValue === "true") return true;
    if (envValue === "false") return false;

    try {
      // 2. CHECK CACHE
      const redis = await getRedis();
      const cacheKey = `sailor:ff:${flag}`;
      const cached = await redis.get<boolean>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // 3. FALL BACK TO ENV FLAGS
      const isEnabled = await envProvider.isEnabled(flag, _context);
      await redis.set(cacheKey, isEnabled, { ex: CACHE_TTL });
      return isEnabled;
    } catch (e) {
      // Fallback if DB/Redis fails and we don't want to bring down the app
      console.warn(`Feature flag [${flag}] check failed, falling back to false`, e);
      return false;
    }
  },

  getVariant: async <T>(
    flag: string,
    defaultValue: T,
    _context?: FeatureFlagContext,
  ): Promise<T> => {
    const envKey = `KILL_SWITCH_${flag.toUpperCase().replace(/-/g, "_")}_VARIANT`;
    const envValue = process.env[envKey];
    if (envValue) {
      try {
        return JSON.parse(envValue) as T;
      } catch {
        return envValue as unknown as T;
      }
    }

    try {
      const redis = await getRedis();
      const cacheKey = `sailor:ff:${flag}:variant`;
      const cached = await redis.get<T>(cacheKey);
      if (cached !== null) return cached;

      const parsedVariant = await envProvider.getVariant(flag, defaultValue, _context);
      await redis.set(cacheKey, parsedVariant, { ex: CACHE_TTL });
      return parsedVariant;
    } catch {
      return defaultValue;
    }
  },
};

// ============================================
// Legacy: Environment-based Provider
// ============================================

const envProvider: FeatureFlagProvider = {
  isEnabled: async (flag: string, context?: FeatureFlagContext) => {
    // Check env var: FEATURE_FLAG_<FLAG_NAME>=true
    const envKey = `FEATURE_FLAG_${flag.toUpperCase().replace(/-/g, "_")}`;
    const envValue = process.env[envKey];

    if (envValue === "true") return true;
    if (envValue === "false") return false;

    // Check plan-based flags
    if (context?.plan) {
      const planKey = `FEATURE_FLAG_${flag.toUpperCase().replace(/-/g, "_")}_${context.plan.toUpperCase()}`;
      if (process.env[planKey] === "true") return true;
    }

    return false;
  },

  getVariant: async <T>(
    flag: string,
    defaultValue: T,
    _context?: FeatureFlagContext,
  ): Promise<T> => {
    const envKey = `FEATURE_FLAG_${flag.toUpperCase().replace(/-/g, "_")}_VARIANT`;
    const envValue = process.env[envKey];

    if (!envValue) return defaultValue;

    try {
      return JSON.parse(envValue) as T;
    } catch {
      return envValue as unknown as T;
    }
  },
};

// ============================================
// In-Memory Provider (for testing/development)
// ============================================

const memoryFlags = new Map<string, boolean | unknown>();

export function createMemoryProvider(
  initialFlags: Record<string, MemoryFlagValue> = {},
): FeatureFlagProvider {
  const flags = new Map<string, MemoryFlagValue>(Object.entries(initialFlags));
  const variants = new Map<string, unknown>();

  return {
    isEnabled: async (flag: string, context?: FeatureFlagContext) => {
      const value = flags.get(flag);
      if (typeof value === "boolean") return value;
      if (!value?.enabled) return false;
      if (value.rolloutPercentage === undefined) return true;

      const rolloutKey = getRolloutKey(flag, context);
      if (!rolloutKey) return false;
      return isEnabledForPercentage(flag, rolloutKey, value.rolloutPercentage);
    },
    getVariant: async <T>(
      flag: string,
      defaultValue: T,
      context?: FeatureFlagContext,
    ): Promise<T> => {
      const explicitVariant = variants.get(flag);
      if (explicitVariant !== undefined) return explicitVariant as T;

      const rule = flags.get(flag);
      if (typeof rule === "object" && rule?.variants) {
        const rolloutKey = getRolloutKey(flag, context);
        if (rolloutKey) {
          const variantNames = Object.keys(rule.variants).sort();
          if (variantNames.length > 0) {
            const selected = variantNames[getRolloutBucket(flag, rolloutKey) % variantNames.length];
            if (selected !== undefined) return rule.variants[selected] as T;
          }
        }
      }

      return defaultValue;
    },
  };
}

export const memoryProvider: FeatureFlagProvider = createFeatureFlagProviderAdapter({
  isEnabled: async (flag: string, context?: FeatureFlagContext) => {
    const value = memoryFlags.get(flag) as MemoryFlagValue | undefined;
    if (typeof value === "boolean") return value;
    if (!value?.enabled) return false;
    if (value.rolloutPercentage === undefined) return true;

    const rolloutKey = getRolloutKey(flag, context);
    if (!rolloutKey) return false;
    return isEnabledForPercentage(flag, rolloutKey, value.rolloutPercentage);
  },
  getVariant: async <T>(
    flag: string,
    defaultValue: T,
    context?: FeatureFlagContext,
  ): Promise<T> => {
    const value = memoryFlags.get(`${flag}:variant`);
    if (value !== undefined) return value as T;

    const rule = memoryFlags.get(flag) as MemoryFlagValue | undefined;
    if (typeof rule === "object" && rule?.variants) {
      const rolloutKey = getRolloutKey(flag, context);
      if (rolloutKey) {
        const variantNames = Object.keys(rule.variants).sort();
        if (variantNames.length > 0) {
          const selected = variantNames[getRolloutBucket(flag, rolloutKey) % variantNames.length];
          if (selected !== undefined) return rule.variants[selected] as T;
        }
      }
    }

    return defaultValue;
  },
});

export function setMemoryFlag(flag: string, enabled: boolean): void {
  memoryFlags.set(flag, enabled);
}

export function setMemoryFlagRule(flag: string, rule: MemoryFlagRule): void {
  memoryFlags.set(flag, rule);
}

export function setMemoryVariant<T>(flag: string, value: T): void {
  memoryFlags.set(`${flag}:variant`, value);
}

export function clearMemoryFlags(): void {
  memoryFlags.clear();
}

// ============================================
// Main API
// ============================================

let provider: FeatureFlagProvider = dbProvider;

export function setFeatureFlagProvider(newProvider: FeatureFlagProvider): void {
  provider = newProvider;
}

export function useDbProvider(): void {
  provider = dbProvider;
}

export function useEnvProvider(): void {
  provider = envProvider;
}

export function useMemoryProvider(): void {
  provider = memoryProvider;
}

/**
 * Check if a feature flag is enabled
 */
export async function isFeatureEnabled(
  flag: string,
  context?: FeatureFlagContext,
): Promise<boolean> {
  return provider.isEnabled(flag, context);
}

/**
 * Get feature flag variant value
 */
export async function getFeatureVariant<T>(
  flag: string,
  defaultValue: T,
  context?: FeatureFlagContext,
): Promise<T> {
  return provider.getVariant(flag, defaultValue, context);
}

// ============================================
// Convenience: Percentage-based rollout
// ============================================

export async function isEnabledForPercentage(
  flag: string,
  userId: string,
  percentage: number,
): Promise<boolean> {
  if (percentage <= 0) return false;
  if (percentage >= 100) return true;
  return getRolloutBucket(flag, userId) < percentage;
}

function getRolloutKey(flag: string, context?: FeatureFlagContext): string | undefined {
  if (!context) return undefined;
  if (context.userId && context.tenantId) return `${context.tenantId}:${context.userId}`;
  return context.userId ?? context.tenantId ?? `${flag}:${context.environment ?? ""}`;
}

function getRolloutBucket(flag: string, key: string): number {
  return stableHash(`${flag}:${key}`) % 100;
}

function stableHash(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// ============================================
// Pre-defined Feature Flags (type-safe)
// ============================================

export const FLAGS = {
  // AI Features
  AI_STREAMING: "ai-streaming",
  AI_VISION: "ai-vision",
  AI_CODE_INTERPRETER: "ai-code-interpreter",

  // E-commerce
  SHOPIFY_SYNC: "shopify-sync",
  MULTI_CURRENCY: "multi-currency",

  // Web3
  WEB3_WALLET: "web3-wallet",
  NFT_MINTING: "nft-minting",

  // Platform
  MULTI_TENANT: "multi-tenant",
  TEAM_COLLABORATION: "team-collaboration",
  API_V2: "api-v2",

  // Beta
  BETA_FEATURES: "beta-features",
  EXPERIMENTAL_UI: "experimental-ui",

  // Agent Runtime — @nebutra/agent-runtime grammar demo.
  // Off by default; opt-in per tenant. WIP capability absorption.
  AGENT_RUNTIME_DEMO: "agent-runtime-demo",

  // Layer 0 — foundational capability demo (off by default; opt-in per tenant).
  LAYER0_DEMO: "layer0-demo",

  // Atelier — agentic creative canvas (off by default; opt-in per tenant).
  // Kill switch / enable via KILL_SWITCH_ATELIER_CANVAS env or flag store.
  ATELIER_CANVAS: "atelier-canvas",

  // Reel — node-graph + storyboard generative-media studio (off by default;
  // opt-in per tenant). Kill switch via KILL_SWITCH_REEL_STUDIO env.
  REEL_STUDIO: "reel-studio",

  // Auth — Wave 2 dev/prod rollout gates.
  // Consumed via `@nebutra/auth/features.ts` (env first, this service second).
  // Names mirror AuthCapabilities in `packages/iam/auth/src/types.ts`.
  AUTH_PASSKEYS: "auth.passkeys",
  AUTH_ORGANIZATIONS: "auth.organizations",
  AUTH_TWO_FACTOR: "auth.twoFactor",
  AUTH_MAGIC_LINK: "auth.magicLink",
  AUTH_IMPERSONATION: "auth.impersonation",
} as const;

export type FeatureFlag = (typeof FLAGS)[keyof typeof FLAGS];

// ============================================
// Hono Middleware Factory
// ============================================

/**
 * Returns a Hono middleware that gates a route behind a feature flag.
 *
 * The tenant context (userId, tenantId, plan) is read from `c.get("tenant")`
 * if it has been populated by tenantContextMiddleware upstream.
 *
 * @param flag - Feature flag name (use `FLAGS.*` constants for type safety)
 * @param options.onDisabled - Optional custom response when flag is off.
 *   Defaults to 403 JSON error.
 *
 * @example
 * import { featureFlagMiddleware, FLAGS } from "@nebutra/feature-flags";
 *
 * app.use("/api/v1/ai/vision/*", featureFlagMiddleware(FLAGS.AI_VISION));
 */
export function featureFlagMiddleware(
  flag: string,
  options: {
    onDisabled?: (c: unknown) => unknown;
  } = {},
) {
  return async (
    c: {
      get: (key: string) => { userId?: string; organizationId?: string; plan?: string } | undefined;
      json: (body: unknown, status?: number) => unknown;
    },
    next: () => Promise<void>,
  ) => {
    const tenant = c.get("tenant") as
      | { userId?: string; organizationId?: string; plan?: string }
      | undefined;

    const plan = tenant?.plan as FeatureFlagContext["plan"] | undefined;
    const context: FeatureFlagContext = {
      ...(tenant?.userId !== undefined ? { userId: tenant.userId } : {}),
      ...(tenant?.organizationId !== undefined ? { tenantId: tenant.organizationId } : {}),
      ...(plan !== undefined ? { plan } : {}),
    };

    const enabled = await isFeatureEnabled(flag, context);

    if (!enabled) {
      if (options.onDisabled) {
        return options.onDisabled(c);
      }
      return (c as { json: (body: unknown, status: number) => unknown }).json(
        { error: "Feature not available", feature: flag },
        403,
      );
    }

    return next();
  };
}
