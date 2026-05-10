import type { MCPContext, ToolExecutionResult } from "../types.js";

/**
 * MCP Middleware for rate limiting, audit logging, and access control
 */

export interface MCPMiddlewareContext extends MCPContext {
  toolName: string;
  arguments: Record<string, unknown>;
}

export type MCPMiddlewareNext = () => Promise<ToolExecutionResult>;

export type MCPMiddleware = (
  ctx: MCPMiddlewareContext,
  next: MCPMiddlewareNext,
) => Promise<ToolExecutionResult>;

/**
 * Rate limiting middleware for MCP calls
 */
export function createRateLimitMiddleware(options: {
  maxRequests: number;
  windowMs: number;
}): MCPMiddleware {
  const requests = new Map<string, { count: number; resetAt: number }>();

  return async (ctx, next) => {
    const key = `${ctx.tenantId || "anon"}:${ctx.userId || "anon"}`;
    const now = Date.now();

    let record = requests.get(key);
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + options.windowMs };
      requests.set(key, record);
    }

    record.count++;

    if (record.count > options.maxRequests) {
      return {
        success: false,
        error: `MCP rate limit exceeded. Max ${options.maxRequests} requests per ${options.windowMs / 1000}s`,
        duration: 0,
      };
    }

    return next();
  };
}

/**
 * Audit logging middleware
 */
export function createAuditMiddleware(options: {
  onLog: (entry: AuditLogEntry) => void | Promise<void>;
}): MCPMiddleware {
  return async (ctx, next) => {
    const result = await next();

    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      toolName: ctx.toolName,
      arguments: ctx.arguments,
      success: result.success,
      duration: result.duration,
    };

    if (ctx.tenantId) entry.tenantId = ctx.tenantId;
    if (ctx.userId) entry.userId = ctx.userId;
    if (result.error) entry.error = result.error;

    // Don't block on audit logging
    Promise.resolve(options.onLog(entry)).catch(console.error);

    return result;
  };
}

export interface AuditLogEntry {
  timestamp: string;
  requestId: string;
  tenantId?: string;
  userId?: string;
  toolName: string;
  arguments: Record<string, unknown>;
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * Tool access control middleware
 */
export function createAccessControlMiddleware(options: {
  blockedTools?: string[];
  allowedTools?: string[];
}): MCPMiddleware {
  return async (ctx, next) => {
    // Check blocked list
    if (options.blockedTools?.includes(ctx.toolName)) {
      return {
        success: false,
        error: `Tool ${ctx.toolName} is blocked`,
        duration: 0,
      };
    }

    // Check allowed list (if specified)
    if (
      options.allowedTools &&
      options.allowedTools.length > 0 &&
      !options.allowedTools.includes(ctx.toolName)
    ) {
      return {
        success: false,
        error: `Tool ${ctx.toolName} is not in allowed list`,
        duration: 0,
      };
    }

    return next();
  };
}

/**
 * Compose multiple middlewares
 */
export function composeMCPMiddleware(middlewares: MCPMiddleware[]): MCPMiddleware {
  return async (ctx, finalNext) => {
    let index = -1;

    const dispatch = async (i: number): Promise<ToolExecutionResult> => {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;

      const middleware = middlewares[i];
      if (!middleware) {
        return finalNext();
      }

      return middleware(ctx, () => dispatch(i + 1));
    };

    return dispatch(0);
  };
}
