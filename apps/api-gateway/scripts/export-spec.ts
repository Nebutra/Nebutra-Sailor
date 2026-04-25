/**
 * export-spec.ts — exports the Hono OpenAPI spec to openapi.json
 *
 * Run: tsx scripts/export-spec.ts
 * Output: apps/api-gateway/openapi.json
 *
 * Used in CI to validate the spec and generate typed clients for the web app.
 * Imports only the Hono app (not the HTTP server) so no live DB is required.
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Stub environment variables so the app module loads without crashing.
// The spec export only calls app.request() — no DB queries are executed.
process.env.DATABASE_URL ??= "postgresql://stub:stub@localhost:5432/stub";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.CLERK_SECRET_KEY ??= "sk_test_stub";
process.env.NODE_ENV ??= "production";
process.env.RESEND_API_KEY ??= "re_stub_key_for_spec_export";
process.env.UPSTASH_REDIS_REST_URL ??= "https://stub.upstash.io";
process.env.UPSTASH_REDIS_REST_TOKEN ??= "stub_token_for_spec_export";

const { default: app } = await import("../src/index.js");

const response = await app.request("/openapi.json");

if (!response.ok) {
  process.exit(1);
}

function normalizeAnonymousAnySchema(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeAnonymousAnySchema);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record);

    if (keys.length === 1 && record.nullable === true) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(record).map(([key, entry]) => [key, normalizeAnonymousAnySchema(entry)]),
    );
  }

  return value;
}

const spec = normalizeAnonymousAnySchema(await response.json());
const outPath = resolve(import.meta.dirname, "../openapi.json");

writeFileSync(outPath, JSON.stringify(spec, null, 2), "utf-8");

// Force exit: importing src/index.js starts the HTTP server as a side effect,
// which keeps the Node process alive. We must explicitly exit after the spec
// is written so CI doesn't hang.
process.exit(0);
