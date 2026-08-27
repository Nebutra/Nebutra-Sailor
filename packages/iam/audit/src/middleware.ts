// =============================================================================
// Request-bound audit helpers
// =============================================================================
// Two ergonomic entry points for application code:
//
//   auditLogger(req, defaults)
//     Returns a thin context-bound logger pre-populated with actor, tenant, IP,
//     userAgent, and requestId derived from a Request/Headers. Application
//     code calls `await audit.log({ action, resource, outcome, ... })`.
//
//   withAudit({ action, resource, ... }, handler)
//     Wraps a Next.js Route Handler — runs the handler and emits a
//     success/failure audit event around it. Handler exceptions are re-thrown
//     after logging so callers' error handling is preserved.
//
// Both helpers are provider-agnostic: they go through getAuditProvider() and
// honor the AUDIT_PROVIDER env var.
// =============================================================================

import { logger } from "@nebutra/logger";
import { getAuditProvider } from "./providers";
import {
  type ActorType,
  type AuditEvent,
  AuditEventInputSchema,
  type Outcome,
  type Resource,
} from "./schema";

// -----------------------------------------------------------------------------
// Context extraction
// -----------------------------------------------------------------------------

interface HeaderLike {
  get(name: string): string | null;
}

interface RequestLike {
  headers: HeaderLike;
}

function readHeader(req: RequestLike | undefined, name: string): string | undefined {
  if (!req) return undefined;
  const value = req.headers.get(name);
  return value ?? undefined;
}

export interface AuditRequestContext {
  ip?: string;
  userAgent?: string;
  requestId?: string;
}

export function extractRequestContext(req: RequestLike | undefined): AuditRequestContext {
  if (!req) return {};
  const xff = readHeader(req, "x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() ?? readHeader(req, "x-real-ip");
  const userAgent = readHeader(req, "user-agent");
  const requestId =
    readHeader(req, "x-request-id") ??
    readHeader(req, "x-vercel-id") ??
    readHeader(req, "x-amzn-trace-id");

  return {
    ...(ip ? { ip } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(requestId ? { requestId } : {}),
  };
}

// -----------------------------------------------------------------------------
// auditLogger — context-bound logger for use inside route handlers
// -----------------------------------------------------------------------------

export interface AuditLoggerDefaults {
  actor: { id: string; type: ActorType; email?: string; name?: string };
  tenantId: string;
  resource?: Resource;
}

export interface AuditLoggerLogInput {
  action: string;
  outcome: Outcome;
  resource?: Resource;
  severity?: AuditEvent["severity"];
  changes?: AuditEvent["changes"];
  metadata?: Record<string, unknown>;
}

export interface BoundAuditLogger {
  log(input: AuditLoggerLogInput): Promise<void>;
}

/**
 * Build a request-scoped audit logger. The returned object pre-populates
 * actor/tenant/ip/userAgent fields so call sites only need to supply the
 * action-specific data.
 */
export function auditLogger(
  req: RequestLike | undefined,
  defaults: AuditLoggerDefaults,
): BoundAuditLogger {
  const context = extractRequestContext(req);

  return {
    async log(input: AuditLoggerLogInput): Promise<void> {
      const resource = input.resource ?? defaults.resource;
      if (!resource) {
        // Defensive: a missing resource means the call site forgot to specify
        // what was acted upon. Log via @nebutra/logger so this never silently
        // breaks audit coverage.
        logger.warn("[audit] auditLogger.log called without resource — event dropped", {
          action: input.action,
        });
        return;
      }

      const eventInput = {
        actor: defaults.actor,
        tenantId: defaults.tenantId,
        action: input.action,
        outcome: input.outcome,
        resource,
        severity: input.severity ?? "info",
        context,
        ...(input.changes ? { changes: input.changes } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      };

      await emitAuditEvent(eventInput);
    },
  };
}

// -----------------------------------------------------------------------------
// withAudit — Route Handler wrapper
// -----------------------------------------------------------------------------

export interface WithAuditOptions {
  action: string;
  /** A function that derives actor/tenant/resource from the incoming request. */
  resolveContext: (
    req: Request,
  ) => Promise<AuditLoggerDefaults | null> | AuditLoggerDefaults | null;
  /** A function that derives the resource from the request (after handler success). */
  resolveResource?: (
    req: Request,
    response: Response,
  ) => Promise<Resource | undefined> | Resource | undefined;
  severity?: AuditEvent["severity"];
}

/**
 * Wrap a Next.js Route Handler with automatic audit logging. The handler is
 * invoked exactly once; its outcome is observed and recorded.
 *
 * @example
 * ```ts
 * export const POST = withAudit(
 *   {
 *     action: "api_key.created",
 *     resolveContext: async (req) => {
 *       const auth = await getAuth(req);
 *       if (!auth.userId || !auth.orgId) return null;
 *       return {
 *         actor: { id: auth.userId, type: "user" },
 *         tenantId: auth.orgId,
 *       };
 *     },
 *   },
 *   async (req) => {
 *     // ... existing handler body
 *   },
 * );
 * ```
 */
export function withAudit(
  options: WithAuditOptions,
  handler: (req: Request) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const context = extractRequestContext(req);
    let defaults: AuditLoggerDefaults | null = null;

    try {
      defaults = await options.resolveContext(req);
    } catch (error) {
      logger.warn("[audit] withAudit.resolveContext threw — skipping audit", {
        action: options.action,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    let response: Response | null = null;
    let handlerError: unknown = null;
    try {
      response = await handler(req);
    } catch (error) {
      handlerError = error;
    }

    if (defaults) {
      // Determine outcome:
      //   - handler threw            → "failure"
      //   - response 4xx (auth/perm) → "denied"
      //   - response 5xx             → "failure"
      //   - else                     → "success"
      let outcome: Outcome = "success";
      if (handlerError || !response) {
        outcome = "failure";
      } else {
        const status = response.status;
        if (status === 401 || status === 403) outcome = "denied";
        else if (status >= 500) outcome = "failure";
      }

      let resource: Resource = defaults.resource ?? {
        type: "request",
        id: req.url,
      };
      if (options.resolveResource && response && !handlerError) {
        try {
          const resolved = await options.resolveResource(req, response);
          if (resolved) resource = resolved;
        } catch {
          // Keep the default — resource resolution is best-effort.
        }
      }

      await emitAuditEvent({
        actor: defaults.actor,
        tenantId: defaults.tenantId,
        action: options.action,
        outcome,
        resource,
        severity: options.severity ?? "info",
        context,
      });
    }

    if (handlerError) throw handlerError;
    // After re-throwing on error, `response` is guaranteed non-null here.
    return response as Response;
  };
}

// -----------------------------------------------------------------------------
// Internal: validate + dispatch
// -----------------------------------------------------------------------------

async function emitAuditEvent(input: unknown): Promise<void> {
  try {
    const parsed = AuditEventInputSchema.parse(input);
    const event: AuditEvent = {
      id: parsed.id ?? crypto.randomUUID(),
      timestamp: parsed.timestamp ?? new Date().toISOString(),
      actor: parsed.actor,
      tenantId: parsed.tenantId,
      action: parsed.action,
      resource: parsed.resource,
      outcome: parsed.outcome,
      severity: parsed.severity ?? "info",
      context: parsed.context ?? {},
      ...(parsed.changes ? { changes: parsed.changes } : {}),
      ...(parsed.metadata ? { metadata: parsed.metadata } : {}),
    };

    const provider = await getAuditProvider();
    await provider.log(event);
  } catch (error) {
    // Audit failures must NEVER break the calling code path — log and swallow.
    logger.error("[audit] Failed to emit audit event", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
