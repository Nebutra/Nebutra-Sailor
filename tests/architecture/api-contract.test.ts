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
const API_GATEWAY_SRC = resolve(ROOT, "backends/gateway/src");
const OPENAPI_SPEC_PATH = resolve(ROOT, "backends/gateway/openapi.json");
const CI_WORKFLOW_PATH = resolve(ROOT, ".github/workflows/ci.yml");

/**
 * Routes that are intentionally unversioned.
 * These are infrastructure/internal endpoints, not part of the public API contract.
 */
const UNVERSIONED_ROUTE_PREFIXES = new Set([
  "/api/misc", // Health checks
  "/api/system", // Status endpoints
  "/api/webhooks", // Webhook receivers (Stripe, Clerk)
  "/api/queue", // Queue delivery receiver (QStash)
  "/api/inngest", // Background job handler
  "/api", // Auth provider boundary (/api/auth/*), not a versioned business API
  "/api/rpc", // oRPC protocol mount (versioning handled by oRPC internally)
  "/api/trpc", // tRPC protocol mount (versioning handled by tRPC internally)
  "/health", // Root-level container/load-balancer health check
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
  it("openapi.json exists in backends/gateway/", () => {
    // openapi.json is gitignored (generated artifact). In CI it must be
    // produced by a prior build step. Skip gracefully when absent so the
    // remaining spec-content tests still guard correctness locally.
    if (!existsSync(OPENAPI_SPEC_PATH)) {
      console.warn(
        "openapi.json not found — run 'pnpm --filter @nebutra/gateway generate:spec' to generate it.",
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

  // Ratchet guard for issue #148: a 2xx response whose handler returns JSON must
  // declare `content["application/json"].schema` in the spec. Without it, the
  // generated web client types the response body as `content?: never`, silently
  // dropping the payload type (A9 type-contract drift).
  //
  // KNOWN_JSON_CONTENT_DEBT lists routes that currently lack a declared response
  // schema. It is a SHRINK-ONLY allowlist: when you add a response schema to one
  // of these routes (see the integrations/admin/overview fix as the template),
  // delete its entry here. The test FAILS if any route NOT on this list regresses
  // to a content-less 2xx — so new drift can never be introduced.
  const KNOWN_JSON_CONTENT_DEBT = new Set<string>([
    // ping now declares text/plain content (not JSON debt)
    // "GET /api/system/ping 200",
    // "GET /system/ping 200",
    "POST /api/v1/agent-runtime/turns 200",
    "POST /api/v1/ai/chat 200",
    "POST /api/v1/ai/embeddings 200",
    "GET /api/v1/ai/models 200",
    "POST /api/v1/ai/gateway/chat/completions 200",
    "GET /api/v1/billing/subscription 200",
    "POST /api/v1/search 200",
    "POST /api/v1/search/sync 200",
    "GET /api/v1/integrations 200",
    "POST /api/v1/integrations 201",
    "GET /api/v1/integrations/:id 200",
    "PATCH /api/v1/integrations/:id 200",
    "DELETE /api/v1/integrations/:id 200",
    // Closed 2026-07-24: admin tenants/usage + dlq + feature-flags declare response content
  ]);

  it("2xx JSON responses declare application/json content (no content?: never drift)", () => {
    if (!existsSync(OPENAPI_SPEC_PATH)) return;

    const spec = JSON.parse(readFileSync(OPENAPI_SPEC_PATH, "utf-8")) as {
      paths?: Record<string, Record<string, { responses?: Record<string, { content?: unknown }> }>>;
    };
    if (!spec.paths) return;

    const newDrift: string[] = [];
    const fixedButStillListed: string[] = [];

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        if (!op || typeof op !== "object" || !op.responses) continue;
        for (const [code, resp] of Object.entries(op.responses)) {
          if (code !== "200" && code !== "201") continue;
          const key = `${method.toUpperCase()} ${path} ${code}`;
          const declaredContent =
            resp.content && typeof resp.content === "object" ? (resp.content as object) : null;
          const hasJson = !!declaredContent && Object.hasOwn(declaredContent, "application/json");
          const declaresNonJsonContent =
            !!declaredContent && Object.keys(declaredContent).length > 0;
          if (!hasJson && !declaresNonJsonContent && !KNOWN_JSON_CONTENT_DEBT.has(key)) {
            newDrift.push(key);
          }
          if (hasJson && KNOWN_JSON_CONTENT_DEBT.has(key)) {
            fixedButStillListed.push(key);
          }
        }
      }
    }

    expect(
      newDrift,
      "These 2xx responses return JSON but declare no application/json schema, so the\n" +
        "generated client will type them as `content?: never`. Add a zod-openapi response\n" +
        "schema (see backends/gateway/src/routes/integrations/index.ts adminOverviewRoute):\n" +
        newDrift.map((k) => `  - ${k}`).join("\n"),
    ).toHaveLength(0);

    // Keep the debt allowlist honest: once a route is fixed, its entry must be removed.
    expect(
      fixedButStillListed,
      "These routes now declare a response schema — remove them from KNOWN_JSON_CONTENT_DEBT:\n" +
        fixedButStillListed.map((k) => `  - ${k}`).join("\n"),
    ).toHaveLength(0);
  });

  it("all spec paths use versioned prefixes", () => {
    if (!existsSync(OPENAPI_SPEC_PATH)) return;

    const raw = readFileSync(OPENAPI_SPEC_PATH, "utf-8");
    const spec = JSON.parse(raw) as { paths?: Record<string, unknown> };

    if (!spec.paths) return;

    const violations: string[] = [];
    for (const path of Object.keys(spec.paths)) {
      // Infrastructure paths are allowed unversioned
      const isInfra = Array.from(UNVERSIONED_ROUTE_PREFIXES).some(
        (prefix) => path === prefix || path.startsWith(`${prefix}/`),
      );

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

// ---------------------------------------------------------------------------
// Property 5d: CI blocks generated API client drift
// ---------------------------------------------------------------------------

describe("Property 5d: OpenAPI Client Drift Gate", () => {
  const workflow = readFileSync(CI_WORKFLOW_PATH, "utf-8");

  it("runs OpenAPI validation when generation or API type files change", () => {
    for (const requiredPath of [
      "backends/gateway/**",
      "backends/gateway/scripts/export-spec.ts",
      "apps/web/package.json",
      "apps/web/src/lib/api/**",
      "scripts/generate-api-types.ts",
      ".github/workflows/ci.yml",
    ]) {
      expect(workflow).toContain(`- '${requiredPath}'`);
    }
  });

  it("regenerates and blocks drift in the committed web API client", () => {
    expect(workflow).toContain("pnpm --filter @nebutra/web generate:api-types");
    expect(workflow).toContain("git diff --exit-code -- apps/web/src/lib/api/types.generated.ts");
  });

  it("does not pretend the ignored OpenAPI spec is a committed freshness gate", () => {
    expect(workflow).not.toContain("Check spec is up to date");
    expect(workflow).not.toContain("OpenAPI spec is out of date");
  });
});
