#!/usr/bin/env npx tsx
/**
 * Environment Variables Validation Script
 *
 * Run before starting services to ensure all required env vars are set.
 * Usage: npx tsx infra/ops/scripts/check-env.ts [--app=web|api-gateway|...]
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "../../..");

// ============================================
// Required Environment Variables by Context
// ============================================

const REQUIRED_VARS = {
  // Core (always required)
  core: ["NODE_ENV"],

  // Database
  database: ["DATABASE_URL"],

  // Auth (Clerk)
  auth: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],

  // Redis
  redis: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],

  // AI Services
  ai: ["OPENAI_API_KEY"],

  // Billing
  billing: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],

  // Observability (optional in dev)
  observability: [
    // "SENTRY_DSN",
    // "OTEL_EXPORTER_OTLP_ENDPOINT",
  ],
} as const;

// App-specific required vars
const APP_REQUIREMENTS: Record<string, (keyof typeof REQUIRED_VARS)[]> = {
  web: ["core", "database", "auth", "redis"],
  "landing-page": ["core", "auth"],
  "api-gateway": ["core", "database", "auth", "redis", "ai"],
  gateway: ["core", "database", "auth", "redis", "ai"],
  studio: ["core"],
};

// ============================================
// Validation Logic
// ============================================

interface ValidationResult {
  missing: string[];
  empty: string[];
  valid: string[];
}

function validateEnvVars(requiredVars: string[]): ValidationResult {
  const result: ValidationResult = {
    missing: [],
    empty: [],
    valid: [],
  };

  for (const varName of requiredVars) {
    const value = process.env[varName];

    if (value === undefined) {
      result.missing.push(varName);
    } else if (value.trim() === "") {
      result.empty.push(varName);
    } else {
      result.valid.push(varName);
    }
  }

  return result;
}

function loadEnvFile(envPath: string): void {
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const [key, ...valueParts] = trimmed.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function resolveEnvFileForApp(appName: string): string | null {
  const explicitPaths: Record<string, string> = {
    "landing-page": resolve(REPO_ROOT, "apps/landing-page/.env.local"),
    web: resolve(REPO_ROOT, "apps/web/.env.local"),
    studio: resolve(REPO_ROOT, "apps/studio/.env.local"),
    gateway: resolve(REPO_ROOT, "backends/gateway/.env.local"),
    "api-gateway": resolve(REPO_ROOT, "backends/gateway/.env.local"),
  };

  if (appName in explicitPaths) {
    return explicitPaths[appName];
  }

  const appPath = resolve(REPO_ROOT, `apps/${appName}/.env.local`);
  if (existsSync(appPath)) return appPath;

  const backendPath = resolve(REPO_ROOT, `backends/${appName}/.env.local`);
  if (existsSync(backendPath)) return backendPath;

  return null;
}

function getRequiredVarsForApp(appName: string): string[] {
  const categories = APP_REQUIREMENTS[appName] || ["core"];
  const vars: string[] = [];

  for (const category of categories) {
    vars.push(...REQUIRED_VARS[category]);
  }

  return [...new Set(vars)];
}

// ============================================
// Main
// ============================================

function main(): void {
  const args = process.argv.slice(2);
  const appArg = args.find((arg) => arg.startsWith("--app="));
  const appName = appArg?.split("=")[1];
  const isCI = process.env.CI === "true";
  const skipValidation = process.env.SKIP_ENV_VALIDATION === "true";

  if (skipValidation) {
    process.stdout.write("[check-env] skipped via SKIP_ENV_VALIDATION=true\n");
    process.exit(0);
  }

  // Load .env files
  loadEnvFile(resolve(REPO_ROOT, ".env"));
  loadEnvFile(resolve(REPO_ROOT, ".env.local"));

  if (appName) {
    const appEnvPath = resolveEnvFileForApp(appName);
    if (appEnvPath) {
      loadEnvFile(appEnvPath);
    }
  }

  // Determine required vars
  const requiredVars = appName ? getRequiredVarsForApp(appName) : REQUIRED_VARS.core;

  const result = validateEnvVars(requiredVars);

  // Output results
  if (result.valid.length > 0) {
    process.stdout.write(
      `[check-env] valid (${result.valid.length}): ${result.valid.join(", ")}\n`,
    );
  }

  if (result.empty.length > 0) {
    process.stderr.write(
      `[check-env] empty (${result.empty.length}): ${result.empty.join(", ")}\n`,
    );
  }

  if (result.missing.length > 0) {
    process.stderr.write(
      `[check-env] missing (${result.missing.length}): ${result.missing.join(", ")}\n`,
    );
  }

  // Exit with error if critical vars are missing
  const hasCriticalMissing = result.missing.length > 0 || result.empty.length > 0;

  if (hasCriticalMissing && !isCI) {
    process.exit(1);
  }

  if (hasCriticalMissing && isCI) {
    process.stderr.write("[check-env] CI mode detected; reporting drift without forcing exit 1\n");
  }
}

main();
