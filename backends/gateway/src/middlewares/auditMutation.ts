/**
 * Audit mutation middleware.
 *
 * Fires an audit log entry for every state-changing request (POST, PUT, PATCH, DELETE)
 * after the response is sent. Reads actor / tenant identity from the tenant context
 * set by `tenantContextMiddleware`.
 *
 * Only records the outcome once the handler has resolved — 4xx/5xx outcomes are
 * recorded as "failure" so auditors can see failed attempts as well as successes.
 *
 * Non-blocking: audit write failures are swallowed (the `audit()` function already
 * falls back to structured logging internally).
 */

import { type AuditAction, audit } from "@nebutra/audit";
import type { Context, Next } from "hono";

/** HTTP methods that mutate state and therefore warrant an audit record. */
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Derive the closest matching AuditAction from method + path.
 * Falls back to "custom" when no specific mapping exists.
 */
function inferAction(method: string, path: string): AuditAction {
  const p = path.toLowerCase();

  if (p.includes("/api-keys") || p.includes("/apikeys")) {
    if (method === "POST") return "api.key_create";
    if (method === "DELETE") return "api.key_revoke";
  }
  if (p.includes("/members")) {
    if (method === "POST") return "org.member_add";
    if (method === "DELETE") return "org.member_remove";
  }
  if (p.includes("/billing") || p.includes("/subscription")) {
    return "billing.subscription_update";
  }
  if (p.includes("/export")) return "data.export";
  if (p.includes("/delete") && method === "DELETE") return "data.delete";

  return "custom";
}

export async function auditMutationMiddleware(c: Context, next: Next) {
  if (!MUTATION_METHODS.has(c.req.method)) {
    return next();
  }

  await next();

  // Fire-and-forget after response — must not throw into the handler
  const tenant = c.get("tenant");
  const status = c.res.status;
  const path = new URL(c.req.url).pathname;

  const ip = tenant?.ip;
  const ua = c.req.header("user-agent");

  audit({
    action: inferAction(c.req.method, path),
    actorId: tenant?.userId ?? "anonymous",
    actorType: tenant?.userId ? "user" : "system",
    ...(tenant?.organizationId ? { tenantId: tenant.organizationId } : {}),
    outcome: status >= 200 && status < 400 ? "success" : "failure",
    ...(ip ? { ipAddress: ip } : {}),
    ...(ua ? { userAgent: ua } : {}),
    metadata: {
      method: c.req.method,
      path,
      status,
      requestId: c.get("requestId"),
    },
  }).catch(() => {
    // Swallow — audit() already logs internally
  });
}
