import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Create a structured logger instance
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),

  // Production: JSON format for log aggregation
  // Development: Pretty print for readability
  transport: isProduction
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },

  // Base context for all logs
  base: {
    service: process.env.OTEL_SERVICE_NAME || "nebutra-sailor",
    version: process.env.npm_package_version,
    env: process.env.NODE_ENV,
  },

  // Redact sensitive fields
  redact: {
    paths: [
      "password",
      "token",
      "authorization",
      "apiKey",
      "api_key",
      "secret",
      "*.password",
      "*.token",
      "*.authorization",
      "req.headers.authorization",
      "req.headers.cookie",
    ],
    censor: "[REDACTED]",
  },

  // Serializers
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      params: req.params,
      headers: {
        "user-agent": req.headers["user-agent"],
        "x-request-id": req.headers["x-request-id"],
        "x-tenant-id": req.headers["x-tenant-id"],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
});

/**
 * Create a child logger with tenant context
 */
export function createTenantLogger(context: {
  tenantId?: string;
  userId?: string;
  requestId?: string;
}) {
  return logger.child({
    tenantId: context.tenantId,
    userId: context.userId,
    requestId: context.requestId,
  });
}

/**
 * Request logger middleware for Hono
 */
export function requestLogger() {
  return async (c: any, next: () => Promise<void>) => {
    const start = Date.now();
    const requestId = c.req.header("x-request-id") || crypto.randomUUID();
    const tenantId = c.req.header("x-tenant-id");

    const log = createTenantLogger({ requestId, tenantId });

    log.info({
      msg: "Request started",
      method: c.req.method,
      path: c.req.path,
    });

    try {
      await next();
    } finally {
      const duration = Date.now() - start;
      log.info({
        msg: "Request completed",
        method: c.req.method,
        path: c.req.path,
        status: c.res.status,
        duration,
      });
    }
  };
}

export type Logger = typeof logger;
