/**
 * Errors - Unified error handling for Nebutra services
 *
 * Provides:
 * - Typed error classes
 * - Consistent API error responses
 * - Error serialization for logging
 */

// ============================================
// Error Codes
// ============================================

export const ERROR_CODES = {
  // Client errors (4xx)
  BAD_REQUEST: "BAD_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",

  // Server errors (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  TIMEOUT: "TIMEOUT",

  // Business errors
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED",
  FEATURE_DISABLED: "FEATURE_DISABLED",
  TENANT_SUSPENDED: "TENANT_SUSPENDED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ============================================
// Base Error Class
// ============================================

export interface AppErrorOptions {
  code: ErrorCode;
  message: string;
  statusCode?: number;
  cause?: Error;
  metadata?: Record<string, unknown>;
  isOperational?: boolean;
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode || getDefaultStatusCode(options.code);
    this.isOperational = options.isOperational ?? true;
    if (options.metadata !== undefined) {
      this.metadata = options.metadata;
    }
    this.timestamp = new Date().toISOString();

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      metadata: this.metadata,
    };
  }
}

// ============================================
// Specific Error Classes
// ============================================

export class ValidationError extends AppError {
  public readonly fields?: Record<string, string[]>;

  constructor(message: string, fields?: Record<string, string[]>) {
    super({
      code: ERROR_CODES.VALIDATION_ERROR,
      message,
      statusCode: 400,
      ...(fields !== undefined && { metadata: { fields } }),
    });
    this.name = "ValidationError";
    if (fields !== undefined) {
      this.fields = fields;
    }
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super({ code: ERROR_CODES.UNAUTHORIZED, message, statusCode: 401 });
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super({ code: ERROR_CODES.FORBIDDEN, message, statusCode: 403 });
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource", id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super({ code: ERROR_CODES.NOT_FOUND, message, statusCode: 404 });
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super({ code: ERROR_CODES.CONFLICT, message, statusCode: 409 });
    this.name = "ConflictError";
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number) {
    super({
      code: ERROR_CODES.RATE_LIMITED,
      message: "Too many requests",
      statusCode: 429,
      ...(retryAfter !== undefined && { metadata: { retryAfter } }),
    });
    this.name = "RateLimitError";
    if (retryAfter !== undefined) {
      this.retryAfter = retryAfter;
    }
  }
}

export class QuotaExceededError extends AppError {
  constructor(quota: string, limit: number, current: number) {
    super({
      code: ERROR_CODES.QUOTA_EXCEEDED,
      message: `${quota} quota exceeded (${current}/${limit})`,
      statusCode: 429,
      metadata: { quota, limit, current },
    });
    this.name = "QuotaExceededError";
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, cause?: Error) {
    super({
      code: ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      message: `External service '${service}' failed`,
      statusCode: 502,
      ...(cause !== undefined && { cause }),
      metadata: { service },
    });
    this.name = "ExternalServiceError";
  }
}

export class DatabaseError extends AppError {
  constructor(operation: string, cause?: Error) {
    super({
      code: ERROR_CODES.DATABASE_ERROR,
      message: `Database operation '${operation}' failed`,
      statusCode: 500,
      ...(cause !== undefined && { cause }),
      isOperational: false,
      metadata: { operation },
    });
    this.name = "DatabaseError";
  }
}

// ============================================
// API Response Helpers
// ============================================

export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
}

export function toApiError(error: unknown, requestId?: string): ApiErrorResponse {
  if (error instanceof AppError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        ...(error.metadata !== undefined && { details: error.metadata }),
      },
      ...(requestId !== undefined && { requestId }),
    };
  }

  // Unknown error - don't leak details
  return {
    error: {
      code: ERROR_CODES.INTERNAL_ERROR,
      message: "An unexpected error occurred",
    },
    ...(requestId !== undefined && { requestId }),
  };
}

export function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

// ============================================
// Error Middleware for Hono
// ============================================

interface HonoContext {
  req: { header: (name: string) => string | undefined };
  json: (data: unknown, status?: number) => unknown;
}

export interface ErrorHandlerOptions {
  /**
   * Called for every caught error so callers can route it to their structured
   * logger (e.g. @nebutra/logger).  Defaults to a no-op — DO NOT rely on the
   * previous process.stderr.write behaviour; pass an onError callback instead.
   */
  onError?: (error: unknown, meta: { requestId?: string; statusCode: number }) => void;
}

export function errorHandler(options: ErrorHandlerOptions = {}) {
  return async (c: HonoContext, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error) {
      const requestId = c.req.header("x-request-id");
      const statusCode = getStatusCode(error);
      const response = toApiError(error, requestId);

      options.onError?.(
        error,
        requestId !== undefined ? { requestId, statusCode } : { statusCode },
      );

      return c.json(response, statusCode);
    }
  };
}

// ============================================
// Utility Functions
// ============================================

function getDefaultStatusCode(code: ErrorCode): number {
  switch (code) {
    case ERROR_CODES.BAD_REQUEST:
    case ERROR_CODES.VALIDATION_ERROR:
      return 400;
    case ERROR_CODES.UNAUTHORIZED:
      return 401;
    case ERROR_CODES.PAYMENT_REQUIRED:
    case ERROR_CODES.SUBSCRIPTION_EXPIRED:
      return 402;
    case ERROR_CODES.FORBIDDEN:
    case ERROR_CODES.FEATURE_DISABLED:
    case ERROR_CODES.TENANT_SUSPENDED:
      return 403;
    case ERROR_CODES.NOT_FOUND:
      return 404;
    case ERROR_CODES.CONFLICT:
      return 409;
    case ERROR_CODES.RATE_LIMITED:
    case ERROR_CODES.QUOTA_EXCEEDED:
      return 429;
    case ERROR_CODES.INTERNAL_ERROR:
    case ERROR_CODES.DATABASE_ERROR:
      return 500;
    case ERROR_CODES.EXTERNAL_SERVICE_ERROR:
      return 502;
    case ERROR_CODES.SERVICE_UNAVAILABLE:
      return 503;
    case ERROR_CODES.TIMEOUT:
      return 504;
    default:
      return 500;
  }
}

/**
 * Wrap async function with error handling
 */
export function tryCatch<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => T | Promise<T>,
): Promise<T> {
  return fn().catch((error) => {
    if (errorHandler) {
      return errorHandler(error);
    }
    throw error;
  });
}

/**
 * Assert condition or throw error
 */
export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new AppError({
      code: ERROR_CODES.BAD_REQUEST,
      message,
    });
  }
}

/**
 * Assert not null/undefined or throw NotFoundError
 */
export function assertFound<T>(
  value: T | null | undefined,
  resource: string,
  id?: string,
): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource, id);
  }
}
