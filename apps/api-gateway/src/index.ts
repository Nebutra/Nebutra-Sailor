import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { initializeFromEnv, setAlertErrorHandler } from "@nebutra/alerting";
import { deductCredits, dollarsToCredits } from "@nebutra/billing";
import { getSystemDb } from "@nebutra/db";
import { getStatusCode, toApiError } from "@nebutra/errors";
import {
  calculateCost,
  getModelPricing,
  invalidateBalanceCache,
  registerCompletionWorker,
} from "@nebutra/gateway-core";
import { logger } from "@nebutra/logger";
import { initOtel } from "@nebutra/logger/otel";
import { closeQueue } from "@nebutra/queue";
import { trace } from "@opentelemetry/api";
import { bodyLimit } from "hono/body-limit";
import { compress } from "hono/compress";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { DOMAINS, env } from "./config/env.js";
import { captureRequestError, initSentry } from "./config/sentry.js";
import { inngestHandler } from "./inngest/index.js";
import { buildGatewayDeps } from "./lib/gateway-deps.js";
import { requestContext, runWithContext } from "./lib/requestContext.js";
import { apiVersionMiddleware } from "./middlewares/apiVersion.js";
import { auditMutationMiddleware } from "./middlewares/auditMutation.js";
import { idempotencyMiddleware } from "./middlewares/idempotency.js";
import { rateLimitMiddleware } from "./middlewares/rateLimit.js";
import { tenantContextMiddleware } from "./middlewares/tenantContext.js";
import { usageMeteringMiddleware } from "./middlewares/usageMetering.js";
import { adminRoutes } from "./routes/admin/index.js";
import { agentRoutes } from "./routes/agents/index.js";
import { apiKeysRoutes } from "./routes/ai/api-keys.js";
import { createAiGatewayRoutes } from "./routes/ai/gateway.js";
import { aiRoutes } from "./routes/ai/index.js";
import { usageRoutes } from "./routes/ai/usage.js";
import { creditsRoutes } from "./routes/billing/credits.js";
import { billingRoutes } from "./routes/billing/index.js";
import { usageLedgerRoutes } from "./routes/billing/usage.js";
import { eventRoutes } from "./routes/events/index.js";
import { integrationRoutes } from "./routes/integrations/index.js";
import { consentRoutes } from "./routes/legal/consent.js";
import { healthRoutes } from "./routes/misc/health.js";
import { searchRoutes } from "./routes/search/index.js";
import { statusRoutes } from "./routes/system/status.js";
import { getAuthWebhookRoutes, stripeWebhookRoutes } from "./routes/webhooks/index.js";

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
app.use(
  "*",
  bodyLimit({
    maxSize: 1 * 1024 * 1024, // 1MB
    onError: (c) => {
      return c.json({ error: "Request body too large" }, 413);
    },
  }),
);

// Tenant context extraction (before rate limiting)
app.use("*", tenantContextMiddleware);

// Enrich AsyncLocalStorage context with tenant info now that it's resolved
app.use("*", async (c, next) => {
  const tenant = c.get("tenant");
  const ctx = requestContext.getStore();
  if (ctx && tenant) {
    if (tenant.organizationId !== undefined) ctx.tenantId = tenant.organizationId;
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

// Rate limiting (skip for health/status/webhook/inngest endpoints)
app.use("/api/*", async (c, next) => {
  const path = new URL(c.req.url).pathname;
  if (
    path.startsWith("/api/misc") ||
    path.startsWith("/api/system") ||
    path.startsWith("/misc") ||
    path.startsWith("/system") ||
    path.startsWith("/api/webhooks") ||
    path.startsWith("/api/inngest")
  ) {
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
app.route("/api/v1/ai", aiRoutes);

// AI Gateway — build shared deps once, mount route + register completion worker.
// Graceful degradation: a missing Redis/queue must not prevent app startup.
let gatewayDepsInitialized = false;
try {
  const gatewayDeps = await buildGatewayDeps();
  app.route("/api/v1/ai/gateway", createAiGatewayRoutes(gatewayDeps));

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
      // TODO: wire @nebutra/metering.ingest here once ClickHouse pipeline is live.
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
app.route("/api/v1/ai/usage", usageRoutes);
app.route("/api/v1/billing", billingRoutes);
app.route("/api/v1/billing/credits", creditsRoutes);
app.route("/api/v1/billing", usageLedgerRoutes);
app.route("/api/v1/search", searchRoutes);
app.route("/api/v1/integrations", integrationRoutes);

// Admin routes — protected by X-Admin-Key, not exposed through public ingress
app.route("/api/v1/admin", adminRoutes);

// Webhook routes (raw body — bypass rate limiting)
app.route("/api/webhooks", stripeWebhookRoutes);
// Auth webhook routes (provider-agnostic) — initialized during startup
const authWebhookRoutes = await getAuthWebhookRoutes();
app.route("/api/webhooks", authWebhookRoutes);

// Inngest background job handler (GET for SDK handshake, POST/PUT for execution)
app.on(["GET", "POST", "PUT"], "/api/inngest", (c) => inngestHandler(c));

// tRPC protocol (opt-in via ENABLE_TRPC=true)
if (process.env.ENABLE_TRPC === "true") {
  const { trpcApp } = await import("./trpc/adapter.js");
  app.route("/api/trpc", trpcApp);
}

// oRPC protocol (opt-in via ENABLE_ORPC=true)
if (process.env.ENABLE_ORPC === "true") {
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
  captureRequestError(err, requestId, tenant?.organizationId);
  return c.json(
    toApiError(err, requestId),
    getStatusCode(err) as 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503 | 504,
  );
});

const port = parseInt(process.env.PORT || "3002", 10);

logger.info("API Gateway started", { port });

const server = serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`API Gateway listening on port ${info.port}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);
  server.close(async () => {
    logger.info("HTTP server closed");
    if (gatewayDepsInitialized) {
      try {
        await closeQueue();
        logger.info("Queue connection closed");
      } catch (err) {
        logger.error("Error closing queue during shutdown", err);
      }
    }
    try {
      // AUDIT(no-tenant): graceful shutdown closes the shared connection pool.
      await getSystemDb().$disconnect();
      logger.info("Database connection closed");
    } catch (err) {
      logger.error("Error during shutdown", err);
    }
    process.exit(0);
  });
  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
