/**
 * Config - Unified configuration management
 *
 * MVP: Type-safe env vars with validation
 * Future: Can add remote config, secrets manager, etc.
 */

import { z } from "zod";

// ============================================
// Base Config Schema
// ============================================

export const baseConfigSchema = z.object({
  // Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // App Info
  APP_NAME: z.string().default("nebutra"),
  APP_URL: z.string().url().optional(),

  // Feature Toggles (prefix: FEATURE_FLAG_)
  // These are handled by feature-flags package
});

// ============================================
// Database Config
// ============================================

export const databaseConfigSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_SIZE: z.coerce.number().default(10),
  DATABASE_TIMEOUT: z.coerce.number().default(30000),
});

// ============================================
// Redis Config
// ============================================

export const redisConfigSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
});

// ============================================
// Auth Config (Clerk)
// ============================================

export const authConfigSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
});

// ============================================
// AI Config
// ============================================

export const aiConfigSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_VERTEX_PROJECT: z.string().optional(),
  GOOGLE_VERTEX_LOCATION: z.string().default("us-central1"),
});

// ============================================
// Billing Config (Stripe)
// ============================================

export const billingConfigSchema = z.object({
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

// ============================================
// Storage Config (Cloudflare R2)
// ============================================

export const storageConfigSchema = z.object({
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_ENDPOINT: z.string().url().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),
});

// ============================================
// Observability Config
// ============================================

export const observabilityConfigSchema = z.object({
  SENTRY_DSN: z.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_SERVICE_NAME: z.string().default("nebutra"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

// ============================================
// Alert Config
// ============================================

export const alertConfigSchema = z.object({
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
});

// ============================================
// Config Loader
// ============================================

type ConfigSchema = z.ZodObject<any>;

const loadedConfigs = new Map<string, unknown>();

export function loadConfig<T extends ConfigSchema>(
  schema: T,
  options: { cache?: boolean; prefix?: string } = {},
): z.infer<T> {
  const { cache = true, prefix = "" } = options;
  const cacheKey = schema.description || JSON.stringify(schema.shape);

  if (cache && loadedConfigs.has(cacheKey)) {
    return loadedConfigs.get(cacheKey) as z.infer<T>;
  }

  // Build env object with optional prefix stripping
  const envObj: Record<string, string | undefined> = {};
  for (const key of Object.keys(schema.shape)) {
    const envKey = prefix ? `${prefix}${key}` : key;
    envObj[key] = process.env[envKey];
  }

  const result = schema.parse(envObj);

  if (cache) {
    loadedConfigs.set(cacheKey, result);
  }

  return result;
}

export function clearConfigCache(): void {
  loadedConfigs.clear();
}

// ============================================
// Safe Config Loader (returns errors instead of throwing)
// ============================================

export function safeLoadConfig<T extends ConfigSchema>(
  schema: T,
  options: { prefix?: string } = {},
): { success: true; data: z.infer<T> } | { success: false; errors: z.ZodError } {
  try {
    const data = loadConfig(schema, { ...options, cache: false });
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

// ============================================
// Pre-defined Config Getters
// ============================================

export function getBaseConfig() {
  return loadConfig(baseConfigSchema);
}

export function getDatabaseConfig() {
  return loadConfig(databaseConfigSchema);
}

export function getRedisConfig() {
  return loadConfig(redisConfigSchema);
}

export function getAuthConfig() {
  return loadConfig(authConfigSchema);
}

export function getAiConfig() {
  return loadConfig(aiConfigSchema);
}

export function getBillingConfig() {
  return loadConfig(billingConfigSchema);
}

export function getStorageConfig() {
  return loadConfig(storageConfigSchema);
}

export function getObservabilityConfig() {
  return loadConfig(observabilityConfigSchema);
}

export function getAlertConfig() {
  return loadConfig(alertConfigSchema);
}

// ============================================
// Environment Helpers
// ============================================

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isTest(): boolean {
  return process.env.NODE_ENV === "test";
}

export function getEnvironment(): "development" | "production" | "test" {
  return (process.env.NODE_ENV as "development" | "production" | "test") || "development";
}
