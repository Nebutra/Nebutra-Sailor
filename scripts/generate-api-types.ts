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
const specFile = path.join(ROOT, "backends/gateway/openapi.json");

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
  // Build via turbo so workspace dependencies (their dist/ outputs) are built
  // first via `^build`. A bare `pnpm --filter @nebutra/gateway build` compiles
  // only the gateway and fails with ERR_MODULE_NOT_FOUND when a dependency's
  // dist/ is missing (the environmental cause of the contract-chain breakage).
  process.stdout.write("[generate:api-types] Building api-gateway (+ workspace deps)…\n");
  execSync("pnpm exec turbo run build --filter=@nebutra/gateway", {
    stdio: "inherit",
    cwd: ROOT,
    env: { ...process.env, SKIP_ENV_VALIDATION: "true" },
  });

  process.stdout.write("[generate:api-types] Exporting OpenAPI spec…\n");
  execSync("pnpm --filter @nebutra/gateway generate:spec", {
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

  // export-spec.ts writes raw `JSON.stringify(spec, null, 2)` (arrays expanded),
  // but the committed spec is Biome-formatted (short arrays collapsed). Format
  // it here so the canonical artifact stays churn-free across regenerations.
  process.stdout.write("[generate:api-types] Formatting OpenAPI spec with Biome\n");
  execSync(`pnpm exec biome format --write ${specFile}`, { stdio: "inherit", cwd: ROOT });

  process.stdout.write(`[generate:api-types] Generating types from ${specFile}\n`);
  execSync(`pnpm exec openapi-typescript ${specFile} --output ${outFile}`, {
    stdio: "inherit",
    cwd: ROOT,
  });
  formatGeneratedTypes();
}

process.stdout.write(`[generate:api-types] Done → ${outFile}\n`);
