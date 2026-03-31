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

// ============================================
// Default: Environment-based Provider
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

export const memoryProvider: FeatureFlagProvider = {
  isEnabled: async (flag: string) => {
    return memoryFlags.get(flag) === true;
  },
  getVariant: async <T>(flag: string, defaultValue: T): Promise<T> => {
    const value = memoryFlags.get(`${flag}:variant`);
    return value !== undefined ? (value as T) : defaultValue;
  },
};

export function setMemoryFlag(flag: string, enabled: boolean): void {
  memoryFlags.set(flag, enabled);
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

let provider: FeatureFlagProvider = envProvider;

export function setFeatureFlagProvider(newProvider: FeatureFlagProvider): void {
  provider = newProvider;
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
  // Simple hash-based percentage check
  const hash = simpleHash(userId + flag);
  const bucket = hash % 100;
  return bucket < percentage;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
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
