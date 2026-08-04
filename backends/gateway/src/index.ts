// MUST be the first import — registers global OTel tracer provider before any
// module that emits spans is loaded.
import "./instrumentation.js";

import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { initializeFromEnv, setAlertErrorHandler } from "@nebutra/alerting";
import { configureAuditSystemDb } from "@nebutra/audit";
import { configureBillingTenantDb, deductCredits, dollarsToCredits } from "@nebutra/billing";
import { getSystemDb, getTenantDb } from "@nebutra/db";
import { getStatusCode, toApiError } from "@nebutra/errors";
import { configureLicenseSystemDb } from "@nebutra/license";

// Host injects durable audit + license + billing storage — packages stay free of private @nebutra/db.
configureAuditSystemDb(getSystemDb);
configureLicenseSystemDb(getSystemDb);
configureBillingTenantDb(getTenantDb);

import {
  calculateCost,
  getModelPricing,
  invalidateBalanceCache,
  registerCompletionWorker,
} from "@nebutra/gateway-core";
import { logger } from "@nebutra/logger";
import { initOtel } from "@nebutra/logger/otel";
import { trace } from "@opentelemetry/api";
import type { Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { DOMAINS, env } from "./config/env.js";
import { isOrpcEnabled, isTrpcEnabled } from "./config/protocols.js";
import { captureRequestError, initSentry } from "./config/sentry.js";
import { inngestHandler } from "./inngest/index.js";
import { createAiGatewayIngestUsage } from "./lib/ai-gateway-metering.js";
import { buildGatewayDeps } from "./lib/gateway-deps.js";
import { requestContext, runWithContext } from "./lib/requestContext.js";
import { apiVersionMiddleware } from "./middlewares/apiVersion.js";
import { auditMutationMiddleware } from "./middlewares/auditMutation.js";
import { idempotencyMiddleware } from "./middlewares/idempotency.js";
import { rateLimitMiddleware } from "./middlewares/rateLimit.js";
import { shouldSkipGlobalRateLimit } from "./middlewares/rateLimitSkip.js";
import { tenantContextMiddleware } from "./middlewares/tenantContext.js";
import { usageMeteringMiddleware } from "./middlewares/usageMetering.js";
import { adminRoutes } from "./routes/admin/index.js";
import { agentRuntimeRoutes } from "./routes/agent-runtime/index.js";
import { agentRoutes } from "./routes/agents/index.js";
import { apiKeysRoutes } from "./routes/ai/api-keys.js";
import { createByokResolveUpstreams } from "./routes/ai/byok-upstreams.js";
import { createAiGatewayRoutes } from "./routes/ai/gateway.js";
import { aiRoutes } from "./routes/ai/index.js";
import { providerKeyRoutes } from "./routes/ai/provider-keys/index.js";
import { usageRoutes } from "./routes/ai/usage.js";
import { authRoutes } from "./routes/auth/index.js";
import { creditsRoutes } from "./routes/billing/credits.js";
import { billingRoutes } from "./routes/billing/index.js";
import { usageLedgerRoutes } from "./routes/billing/usage.js";
import { eventRoutes } from "./routes/events/index.js";
import { integrationRoutes } from "./routes/integrations/index.js";
import { consentRoutes } from "./routes/legal/consent.js";
import { healthRoutes } from "./routes/misc/health.js";
import { notificationRoutes } from "./routes/notifications/index.js";
import { pebbleRoutes } from "./routes/pebble/index.js";
import { queueDeliveryRoutes } from "./routes/queue/delivery.js";
import { searchRoutes } from "./routes/search/index.js";
import { startupOsRoutes } from "./routes/startup-os/index.js";
import { statusRoutes } from "./routes/system/status.js";
import { taskRoutes } from "./routes/tasks/index.js";
import { uploadRoutes } from "./routes/uploads/index.js";
import { getAuthWebhookRoutes, stripeWebhookRoutes } from "./routes/webhooks/index.js";
import { workflowRoutes } from "./routes/workflows/index.js";

initOtel({ serviceName: "api-gateway" });
initSentry();

// Wire logger into alerting error handler
setAlertErrorHandler((ctx, err) => logger.error(ctx, err));

// Register alerting channels from environment
const registeredChannels = initializeFromEnv();
if (registeredChannels.length > 0) {
  logger.info("Alerting channels registered", { channels: registeredChannels });
}

const app = new OpenAPIHono();

// Build CORS allowlist from constants + env overrides
const corsOrigins = [
  // Auto-include localhost in non-production environments
  ...(env.NODE_ENV !== "production"
    ? ["http://localhost:3000", "http://localhost:3001", "http://localhost:3003"]
    : []),
  // Production domains — update DOMAINS in config/env.ts to rebrand
  DOMAINS.landing,
  `https://www.${new URL(DOMAINS.landing).hostname}`,
  DOMAINS.app,
  DOMAINS.studio,
  // Per-deployment overrides
  env.LANDING_URL,
  env.WEB_URL,
  env.STUDIO_URL,
  // Arbitrary extra origins (e.g. Vercel preview URLs)
  ...(env.CORS_ORIGINS?.split(",").map((s) => s.trim()) ?? []),
].filter(Boolean) as string[];

// Global middlewares
// Compression — gzip/deflate/brotli for all JSON/text responses
app.use("*", compress());
// Security headers: X-Content-Type-Options, X-Frame-Options, HSTS, etc.
app.use("*", secureHeaders());
app.use("*", requestId());

// AsyncLocalStorage: bind requestId + tenantId into async context so all
// downstream helpers (DB queries, service calls) can read them without
// explicit parameter threading.
app.use("*", async (c, next) => {
  const reqId = c.get("requestId");
  await runWithContext({ requestId: reqId }, next);
});

// Wire requestId and OTel traceId into structured logger context for log
// correlation, and propagate both IDs to the client as response headers.
app.use("*", async (c, next) => {
  const reqId = c.get("requestId");
  const method = c.req.method;
  const path = new URL(c.req.url).pathname;

  const activeSpan = trace.getActiveSpan();
  const traceId = activeSpan?.spanContext().traceId;

  logger.info("incoming request", {
    requestId: reqId,
    method,
    path,
    ...(traceId ? { traceId } : {}),
  });

  const start = Date.now();
  await next();

  logger.info("request completed", {
    requestId: reqId,
    method,
    path,
    status: c.res.status,
    durationMs: Date.now() - start,
    ...(traceId ? { traceId } : {}),
  });

  c.header("X-Request-ID", reqId);
  if (traceId) {
    c.header("X-Trace-ID", traceId);
  }
});

app.use("*", honoLogger());
app.use(
  "*",
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
// Pebble diagnostic bundles are capped at 4 MiB by contract, which is above the
// default body limit. Give that one route its own ceiling rather than raising
// the limit for every endpoint in the gateway.
const DEFAULT_BODY_LIMIT_BYTES = 1 * 1024 * 1024;
const PEBBLE_DIAGNOSTIC_BODY_LIMIT_BYTES = 4 * 1024 * 1024;

const onBodyLimitExceeded = (c: Context) => c.json({ error: "Request body too large" }, 413);

const defaultBodyLimit = bodyLimit({
  maxSize: DEFAULT_BODY_LIMIT_BYTES,
  onError: onBodyLimitExceeded,
});
const pebbleDiagnosticBodyLimit = bodyLimit({
  maxSize: PEBBLE_DIAGNOSTIC_BODY_LIMIT_BYTES,
  onError: onBodyLimitExceeded,
});

app.use("*", (c, next) => {
  const path = new URL(c.req.url).pathname;
  const isPebbleDiagnosticUpload =
    path === "/pebble/diagnostics/upload" || path === "/api/pebble/diagnostics/upload";
  return isPebbleDiagnosticUpload ? pebbleDiagnosticBodyLimit(c, next) : defaultBodyLimit(c, next);
});

// Tenant context extraction (before rate limiting)
app.use("*", tenantContextMiddleware);

// Enrich AsyncLocalStorage context with tenant info now that it's resolved
app.use("*", async (c, next) => {
  const tenant = c.get("tenant");
  const ctx = requestContext.getStore();
  if (ctx && tenant) {
    if (tenant.tenantId !== undefined) ctx.tenantId = tenant.tenantId;
    if (tenant.userId !== undefined) ctx.userId = tenant.userId;
  }
  await next();
});

// Usage metering — non-blocking, fire-and-forget, runs after response
app.use("/api/v1/*", usageMeteringMiddleware);

// Audit logging for all state-changing requests (POST/PUT/PATCH/DELETE)
app.use("/api/v1/*", auditMutationMiddleware);

// Idempotency — replay protection for POST/PUT/PATCH with Idempotency-Key header
app.use("/api/v1/*", idempotencyMiddleware);

// API versioning — sets API-Version header, supports Sunset for deprecated versions
app.use(
  "/api/*",
  apiVersionMiddleware({
    // deprecated: { "v1": "2027-06-30" }, // Uncomment when v2 is ready
  }),
);

// Rate limiting (skip for health/status/auth/webhook/inngest endpoints)
app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (shouldSkipGlobalRateLimit(path)) {
    return next();
  }
  return rateLimitMiddleware(c, next);
});

// Health & Status routes (public, no rate limiting)
app.route("/api/misc", healthRoutes);
app.route("/api/system", statusRoutes);
// Backward-compatible aliases (legacy monitors/workflows)
app.route("/misc", healthRoutes);
app.route("/system", statusRoutes);

// Legal & Consent routes (v1 API)
// Rate limiting is applied by the /api/* middleware above (paths not in the
// skip list). /api/v1/legal/* and /api/v1/events/* are intentionally NOT in
// the skip list so they receive full rate limiting.
app.route("/api/v1/legal", consentRoutes);
app.route("/api/v1/events", eventRoutes);
app.route("/api/v1/agents", agentRoutes);
app.route("/api/v1/agent-runtime", agentRuntimeRoutes);
app.route("/api/v1/startup-os", startupOsRoutes);
app.route("/api/v1/workflows", workflowRoutes);
app.route("/api/v1/ai", aiRoutes);
app.route("/api/v1/tasks", taskRoutes);
app.route("/api/v1/uploads", uploadRoutes);

// Pebble desktop support intake. Unauthenticated by design (desktop users have
// no Nebutra account) — the routes carry their own per-IP limits and size caps.
// `/pebble` is the frozen product namespace so `/v1/*` stays unclaimed for
// other products; see docs/DOMAINS.md. Mounted with and without the `/api`
// prefix because the client calls the bare path on api.nebutra.com.
app.route("/pebble", pebbleRoutes);
app.route("/api/pebble", pebbleRoutes);

app.route("/api", authRoutes);

// AI Gateway — build shared deps once, mount route + register completion worker.
// Graceful degradation: a missing Redis/queue must not prevent app startup.
let gatewayDepsInitialized = false;

export function areGatewayDepsInitialized(): boolean {
  return gatewayDepsInitialized;
}

try {
  const gatewayDeps = await buildGatewayDeps();
  // BYOK: prefer the tenant's own provider key (decrypted server-side) and fall
  // back to the platform env upstreams. See routes/ai/byok-upstreams.ts.
  app.route(
    "/api/v1/ai/gateway",
    createAiGatewayRoutes(gatewayDeps, { resolveUpstreams: createByokResolveUpstreams() }),
  );

  try {
    registerCompletionWorker(gatewayDeps.queue as never, {
      prisma: gatewayDeps.prisma as never,
      redis: gatewayDeps.redis,
      getModelPricing: (model: string) =>
        getModelPricing(model, {
          redis: gatewayDeps.redis,
          prisma: gatewayDeps.prisma as never,
        }),
      calculateCost,
      deductCredits: async (input) => {
        await deductCredits(input as never);
      },
      dollarsToCredits,
      invalidateBalanceCache: async (orgId: string) => {
        await invalidateBalanceCache(orgId, gatewayDeps.redis);
      },
      ingestUsage: createAiGatewayIngestUsage(),
      logger: {
        info: (...args: unknown[]) => logger.info(String(args[0] ?? ""), args[1] as never),
        warn: (...args: unknown[]) => logger.warn(String(args[0] ?? ""), args[1] as never),
        error: (...args: unknown[]) => logger.error(String(args[0] ?? ""), args[1] as never),
      },
    });
    logger.info("[gateway] Completion worker registered");
    gatewayDepsInitialized = true;
  } catch (err) {
    logger.error("[gateway] Failed to register completion worker", err);
  }
} catch (err) {
  logger.error("[gateway] Failed to initialize gateway deps — AI Gateway routes disabled", err);
}

app.route("/api/v1/ai/api-keys", apiKeysRoutes);
app.route("/api/v1/ai/provider-keys", providerKeyRoutes);
app.route("/api/v1/ai/usage", usageRoutes);
app.route("/api/v1/billing", billingRoutes);
app.route("/api/v1/billing/credits", creditsRoutes);
app.route("/api/v1/billing", usageLedgerRoutes);
app.route("/api/v1/notifications", notificationRoutes);
app.route("/api/v1/search", searchRoutes);
app.route("/api/v1/integrations", integrationRoutes);

// Admin routes — protected by X-Admin-Key, not exposed through public ingress
app.route("/api/v1/admin", adminRoutes);

// Webhook routes (raw body — bypass rate limiting)
app.route("/api/webhooks", stripeWebhookRoutes);
// Auth webhook routes (provider-agnostic) — initialized during startup
const authWebhookRoutes = await getAuthWebhookRoutes();
app.route("/api/webhooks", authWebhookRoutes);
// QStash queue delivery endpoint (raw request is verified in @nebutra/queue)
app.route("/api/queue", queueDeliveryRoutes);

// Inngest background job handler (GET for SDK handshake, POST/PUT for execution)
app.on(["GET", "POST", "PUT"], "/api/inngest", (c) => inngestHandler(c));

// Optional API protocols. REST/OpenAPI is always on; tRPC + oRPC are opt-in via
// API_PROTOCOLS (or legacy ENABLE_TRPC/ENABLE_ORPC). See config/protocols.ts.
if (isTrpcEnabled) {
  const { trpcApp } = await import("./trpc/adapter.js");
  app.route("/api/trpc", trpcApp);
}

if (isOrpcEnabled) {
  const { orpcApp } = await import("./orpc/adapter.js");
  app.route("/api/rpc", orpcApp);
}

// SMS auth (enabled when SMS provider is configured)
if (process.env.ALIYUN_SMS_ACCESS_KEY_ID || process.env.TENCENT_SMS_SECRET_ID) {
  const { smsAuthRoutes } = await import("./routes/auth/sms.js");
  app.route("/api/v1/auth/sms", smsAuthRoutes);
}

// OpenAPI spec document (auto-generated from createRoute definitions)
app.doc("/openapi.json", {
  openapi: "3.0.3",
  info: {
    title: "Nebutra API",
    version: "1.0.0",
    description: "Nebutra SaaS Platform API Gateway",
  },
  servers: [{ url: "/", description: "Current server" }],
});

// Swagger UI explorer
app.get("/docs", swaggerUI({ url: "/openapi.json" }));

// Root route
app.get("/", (c) => {
  return c.json({
    name: "Nebutra API Gateway",
    version: "0.1.0",
    status: "running",
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found", path: c.req.path }, 404);
});

// Error handler
app.onError((err, c) => {
  const requestId = c.req.header("x-request-id");
  const tenant = c.get("tenant");
  logger.error("Unhandled error", err, { path: c.req.path, requestId });
  captureRequestError(err, requestId, tenant?.tenantId);
  return c.json(
    toApiError(err, requestId),
    getStatusCode(err) as 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503 | 504,
  );
});

export default app;
