#!/usr/bin/env tsx
/**
 * Generates TypeScript types from the API gateway's OpenAPI spec.
 *
 * Two modes:
 *   1. File mode (default, CI-friendly): exports spec from Hono app then
 *      generates types from the static JSON — no running server needed.
 *   2. URL mode (dev convenience): fetches spec from a running gateway.
 *      Set API_GATEWAY_URL env var to use this mode.
 *
 * Usage:
 *   pnpm generate:api-types                            (file mode)
 *   API_GATEWAY_URL=http://localhost:3002 pnpm generate:api-types  (URL mode)
 *
 * Output: apps/web/src/lib/api/types.generated.ts
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const outFile = path.join(ROOT, "apps/web/src/lib/api/types.generated.ts");
const specFile = path.join(ROOT, "apps/api-gateway/openapi.json");

const gatewayUrl = process.env.API_GATEWAY_URL;

function formatGeneratedTypes() {
  process.stdout.write("[generate:api-types] Formatting generated types with Biome\n");
  execSync(`pnpm exec biome check --write ${outFile}`, {
    stdio: "inherit",
    cwd: ROOT,
  });
}

if (gatewayUrl) {
  // ── URL mode: fetch from running gateway ───────────────────────────────────
  const specUrl = `${gatewayUrl}/openapi.json`;
  process.stdout.write(`[generate:api-types] Fetching spec from ${specUrl}\n`);
  execSync(`pnpm exec openapi-typescript ${specUrl} --output ${outFile}`, {
    stdio: "inherit",
    cwd: ROOT,
  });
  formatGeneratedTypes();
} else {
  // ── File mode: build gateway → export spec → generate types ───────────────
  process.stdout.write("[generate:api-types] Building api-gateway…\n");
  execSync("pnpm --filter @nebutra/api-gateway build", {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env, SKIP_ENV_VALIDATION: "true" },
  });

  process.stdout.write("[generate:api-types] Exporting OpenAPI spec…\n");
  execSync("pnpm --filter @nebutra/api-gateway generate:spec", {
    stdio: "inherit",
    cwd: ROOT,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://stub:stub@localhost:5432/stub",
      REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "sk_test_stub",
    },
  });

  if (!existsSync(specFile)) {
    process.stderr.write(`[generate:api-types] Spec file not found: ${specFile}\n`);
    process.exit(1);
  }

  process.stdout.write(`[generate:api-types] Generating types from ${specFile}\n`);
  execSync(`pnpm exec openapi-typescript ${specFile} --output ${outFile}`, {
    stdio: "inherit",
    cwd: ROOT,
  });
  formatGeneratedTypes();
}

process.stdout.write(`[generate:api-types] Done → ${outFile}\n`);
