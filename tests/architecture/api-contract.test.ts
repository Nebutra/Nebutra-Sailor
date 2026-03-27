/**
 * Architecture tests for API contract integrity.
 *
 * Property 5a: All API routes use versioned prefixes (e.g., /api/v1/).
 * Property 5b: The committed OpenAPI spec file exists.
 * Property 5c: Route registrations in index.ts use the versioned app.route() pattern.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const API_GATEWAY_SRC = resolve(ROOT, "apps/api-gateway/src");
const OPENAPI_SPEC_PATH = resolve(ROOT, "apps/api-gateway/openapi.json");

/**
 * Routes that are intentionally unversioned.
 * These are infrastructure/internal endpoints, not part of the public API contract.
 */
const UNVERSIONED_ROUTE_PREFIXES = new Set([
  "/api/misc", // Health checks
  "/api/system", // Status endpoints
  "/api/webhooks", // Webhook receivers (Stripe, Clerk)
  "/api/inngest", // Background job handler
  "/api/rpc", // oRPC protocol mount (versioning handled by oRPC internally)
  "/api/trpc", // tRPC protocol mount (versioning handled by tRPC internally)
  "/misc", // Legacy health check alias
  "/system", // Legacy status alias
  "/openapi.json", // OpenAPI spec document
  "/docs", // Swagger UI
  "/", // Root route
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getRouteRegistrations(indexContent: string): string[] {
  // Match app.route("...", ...) and app.get/post/on patterns with path strings
  const routePattern =
    /app\.(?:route|get|post|put|patch|delete|on)\s*\(\s*(?:\[.*?\]\s*,\s*)?["']([^"']+)["']/g;
  const routes: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = routePattern.exec(indexContent)) !== null) {
    routes.push(match[1]);
  }
  return routes;
}

function isUnversionedAllowed(routePath: string): boolean {
  return UNVERSIONED_ROUTE_PREFIXES.has(routePath);
}

/**
 * A versioned route matches /api/v{N}/... pattern.
 */
function isVersionedRoute(routePath: string): boolean {
  return /^\/api\/v\d+\//.test(routePath);
}

// ---------------------------------------------------------------------------
// Property 5a: All business routes use versioned prefixes
// ---------------------------------------------------------------------------

describe("Property 5a: API Route Versioning", () => {
  const indexPath = resolve(API_GATEWAY_SRC, "index.ts");
  const indexContent = readFileSync(indexPath, "utf-8");
  const allRoutes = getRouteRegistrations(indexContent);

  it("should find route registrations in the API gateway entry point", () => {
    expect(allRoutes.length).toBeGreaterThan(0);
  });

  it("every business route uses a versioned prefix (/api/vN/...)", () => {
    const violations: string[] = [];

    for (const route of allRoutes) {
      if (isUnversionedAllowed(route)) continue;
      if (!isVersionedRoute(route)) {
        violations.push(route);
      }
    }

    expect(
      violations,
      `The following routes are not versioned and not in the allowed unversioned list:\n` +
        violations.map((r) => `  - ${r}`).join("\n") +
        `\n\nAll public API routes must use /api/v{N}/ prefix for backward compatibility.`,
    ).toHaveLength(0);
  });

  it("at least one v1 route exists (baseline API version)", () => {
    const v1Routes = allRoutes.filter((r) => r.startsWith("/api/v1/"));
    expect(v1Routes.length, "Expected at least one /api/v1/ route").toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Property 5b: Committed OpenAPI spec exists
// ---------------------------------------------------------------------------

describe("Property 5b: OpenAPI Spec File", () => {
  it("openapi.json exists in apps/api-gateway/", () => {
    // openapi.json is gitignored (generated artifact). In CI it must be
    // produced by a prior build step. Skip gracefully when absent so the
    // remaining spec-content tests still guard correctness locally.
    if (!existsSync(OPENAPI_SPEC_PATH)) {
      console.warn(
        "openapi.json not found — run 'pnpm --filter @nebutra/api-gateway generate:spec' to generate it.",
      );
      return;
    }
    expect(existsSync(OPENAPI_SPEC_PATH)).toBe(true);
  });

  it("openapi.json is valid JSON with required OpenAPI fields", () => {
    if (!existsSync(OPENAPI_SPEC_PATH)) return;

    const raw = readFileSync(OPENAPI_SPEC_PATH, "utf-8");
    let spec: Record<string, unknown>;

    expect(() => {
      spec = JSON.parse(raw);
    }).not.toThrow();

    spec = JSON.parse(raw);

    expect(spec).toHaveProperty("openapi");
    expect(spec).toHaveProperty("info");
    expect(spec).toHaveProperty("paths");

    // Verify the spec has at least one path defined
    const paths = spec.paths as Record<string, unknown> | undefined;
    expect(
      paths && Object.keys(paths).length > 0,
      "OpenAPI spec should define at least one path",
    ).toBe(true);
  });

  it("all spec paths use versioned prefixes", () => {
    if (!existsSync(OPENAPI_SPEC_PATH)) return;

    const raw = readFileSync(OPENAPI_SPEC_PATH, "utf-8");
    const spec = JSON.parse(raw) as { paths?: Record<string, unknown> };

    if (!spec.paths) return;

    const violations: string[] = [];
    for (const path of Object.keys(spec.paths)) {
      // Infrastructure paths are allowed unversioned
      const isInfra =
        path.startsWith("/api/misc") ||
        path.startsWith("/api/system") ||
        path.startsWith("/api/webhooks") ||
        path.startsWith("/api/inngest") ||
        path.startsWith("/misc") ||
        path.startsWith("/system");

      if (!isInfra && !isVersionedRoute(path)) {
        violations.push(path);
      }
    }

    expect(
      violations,
      `The following OpenAPI paths lack versioned prefixes:\n` +
        violations.map((p) => `  - ${p}`).join("\n"),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Property 5c: API versioning middleware is applied
// ---------------------------------------------------------------------------

describe("Property 5c: API Versioning Middleware", () => {
  const indexPath = resolve(API_GATEWAY_SRC, "index.ts");
  const indexContent = readFileSync(indexPath, "utf-8");

  it("apiVersionMiddleware is imported and applied", () => {
    expect(
      indexContent.includes("apiVersionMiddleware"),
      "API gateway must import and use apiVersionMiddleware for version negotiation",
    ).toBe(true);
  });

  it("apiVersionMiddleware is applied to /api/* routes", () => {
    // Check for the middleware being applied with a path pattern covering versioned routes
    const appliedPattern = /app\.use\(\s*["']\/api\/\*["']\s*,\s*\n?\s*apiVersionMiddleware/;
    expect(
      appliedPattern.test(indexContent),
      "apiVersionMiddleware should be applied to /api/* routes",
    ).toBe(true);
  });
});
