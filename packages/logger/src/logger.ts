import { context, trace } from "@opentelemetry/api";
import pino from "pino";
import type { Logger, Meta } from "./types.js";

const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

const REDACTED_FIELDS = [
  "password",
  "token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "privateKey",
  "private_key",
  "creditCard",
  "cardNumber",
];

const pinoInstance = pino({
  redact: { paths: REDACTED_FIELDS, censor: "[REDACTED]" },
  ...(isTest
    ? { level: "silent" }
    : {
        level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
        ...(isDev
          ? {
              transport: {
                target: "pino-pretty",
                options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
              },
            }
          : {}),
      }),
});

function serializeError(error: unknown): Meta {
  if (error == null) {
    return {};
  }
  if (error instanceof Error) {
    return {
      err: { message: error.message, stack: error.stack, name: error.name },
    };
  }
  return { err: error };
}

// Returns the active OTel traceId, or undefined when no span is active or OTel
// is not initialized. The try/catch guards against unexpected runtime errors.
function getTraceId(): string | undefined {
  try {
    const span = trace.getSpan(context.active());
    const id = span?.spanContext().traceId;
    return id && id !== "00000000000000000000000000000000" ? id : undefined;
  } catch {
    return undefined;
  }
}

function makeLogger(base: pino.Logger): Logger {
  return {
    debug(msg: string, meta?: Meta) {
      const traceId = getTraceId();
      base.debug({ ...meta, ...(traceId ? { traceId } : {}) }, msg);
    },
    info(msg: string, meta?: Meta) {
      const traceId = getTraceId();
      base.info({ ...meta, ...(traceId ? { traceId } : {}) }, msg);
    },
    warn(msg: string, meta?: Meta) {
      const traceId = getTraceId();
      base.warn({ ...meta, ...(traceId ? { traceId } : {}) }, msg);
    },
    error(msg: string, error?: unknown, meta?: Meta) {
      const traceId = getTraceId();
      base.error({ ...serializeError(error), ...meta, ...(traceId ? { traceId } : {}) }, msg);
    },
    child(bindings: Meta) {
      return makeLogger(base.child(bindings));
    },
  };
}

export const logger: Logger = makeLogger(pinoInstance);

/**
 * Returns a child logger that automatically includes `requestId` in every log
 * line produced by the returned logger.  Use this inside request handlers or
 * middleware to tie log output to a specific HTTP request.
 *
 * @example
 * const reqLogger = withRequestId(c.get("requestId"));
 * reqLogger.info("processing payment", { userId });
 */
export function withRequestId(requestId: string): Logger {
  return logger.child({ requestId });
}
