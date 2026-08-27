/**
 * Better Auth → @nebutra/audit bridge
 *
 * Better Auth uses an "events"-style hook surface (`databaseHooks`) instead of
 * outbound webhooks. Some sensitive auth operations are NOT distinguishable
 * from the catch-all `/api/auth/[...all]` route at the path level — once they
 * reach the route handler, the body has already been consumed by Better Auth's
 * internal handler. To audit those operations we tap the `databaseHooks` that
 * fire deeper in the call stack.
 *
 * Events emitted from this module:
 *   - `auth.password.changed`  — when an `account.update` writes a new
 *     `password` for the credential provider.
 *   - `auth.2fa.enabled`       — when a `user.update` flips `twoFactorEnabled`
 *     from falsy → true (or arrives via the `/two-factor/enable` endpoint).
 *   - `auth.2fa.disabled`      — when a `user.update` flips `twoFactorEnabled`
 *     from true → false (or arrives via the `/two-factor/disable` endpoint).
 *
 * Hooks are best-effort: any failure inside a hook is caught and logged via
 * `@nebutra/logger` so an audit-pipeline outage NEVER blocks an auth flow.
 *
 * Better Auth invokes `databaseHooks` outside the Next.js Request lifecycle,
 * so we cannot use the request-bound `auditLogger(request, ...)` helper. We
 * call the lower-level provider directly, validating each event with the Zod
 * `AuditEventInputSchema` before persistence.
 */

import { logger } from "@nebutra/logger";

// ─── Types ───
// Better Auth's database hook callback shape, narrowed to what we actually
// touch. Using `Record<string, unknown>` keeps the contract decoupled from
// upstream type churn — the runtime checks below are the source of truth.

type HookContext =
  | {
      readonly path?: string;
      readonly headers?: Headers;
      readonly request?: { headers: Headers };
      readonly context?: {
        readonly session?: {
          readonly session?: Record<string, unknown>;
          readonly user?: Record<string, unknown>;
        } | null;
      };
    }
  | null
  | undefined;

interface HookData {
  readonly [key: string]: unknown;
}

// Build the partial `databaseHooks` config that gets merged into
// `betterAuth({ databaseHooks: ... })`.
//
// Returning `unknown` keeps the import surface narrow; the consumer casts to
// the Better Auth option shape so the install site does not need to import
// `@better-auth/core` types here.
export function buildAuditDatabaseHooks(): unknown {
  return {
    user: {
      update: {
        before: async (user: HookData, ctx: HookContext) => {
          // Capture the prior `twoFactorEnabled` value so the `after` hook can
          // diff and emit the correct enable/disable event. We stash on a
          // mutable property of the ctx (Better Auth re-uses the same ctx
          // object across before/after for one operation).
          if (!ctx) return;
          const userId = typeof user.id === "string" ? user.id : undefined;
          if (!userId) return;
          try {
            const auth = ctx.context as { adapter?: unknown } | undefined;
            // Read the prior user via the adapter exposed on the hook ctx.
            // Avoid throwing if the shape ever changes — the worst case is
            // that we emit the path-derived event without a confirmed flip.
            const adapter = (auth as { adapter?: { findOne?: unknown } } | undefined)?.adapter;
            if (adapter && typeof (adapter as { findOne?: unknown }).findOne === "function") {
              const findOne = (
                adapter as {
                  findOne: (args: unknown) => Promise<Record<string, unknown> | null>;
                }
              ).findOne;
              const prior = await findOne({
                model: "user",
                where: [{ field: "id", value: userId }],
              });
              (
                ctx as unknown as { __nebutraPriorUser?: Record<string, unknown> | null }
              ).__nebutraPriorUser = prior;
            }
          } catch (error) {
            logger.warn("[audit-hooks] before(user.update) prior-state read failed", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        },
        after: async (user: HookData, ctx: HookContext) => {
          await safe(async () => {
            const userId = typeof user.id === "string" ? user.id : undefined;
            if (!userId || !ctx) return;

            const path = typeof ctx.path === "string" ? ctx.path : "";
            const stash = (
              ctx as unknown as {
                __nebutraPriorUser?: Record<string, unknown> | null;
              }
            ).__nebutraPriorUser;
            const priorEnabled =
              stash && typeof stash.twoFactorEnabled === "boolean"
                ? stash.twoFactorEnabled
                : undefined;
            const nextEnabled =
              typeof user.twoFactorEnabled === "boolean" ? user.twoFactorEnabled : undefined;

            // Decision tree:
            //   1. If we have a clean before/after diff → emit on flip.
            //   2. Else fall back to ctx.path heuristics.
            let action: "auth.2fa.enabled" | "auth.2fa.disabled" | null = null;
            if (priorEnabled !== undefined && nextEnabled !== undefined) {
              if (!priorEnabled && nextEnabled) action = "auth.2fa.enabled";
              else if (priorEnabled && !nextEnabled) action = "auth.2fa.disabled";
            } else if (path.endsWith("/two-factor/enable") && nextEnabled === true) {
              action = "auth.2fa.enabled";
            } else if (path.endsWith("/two-factor/disable") && nextEnabled === false) {
              action = "auth.2fa.disabled";
            }

            if (!action) return;

            const tenantId = resolveTenantId(ctx, userId);
            await emitAuditEvent({
              actor: buildActor(ctx, userId, user),
              tenantId,
              action,
              resource: { type: "user", id: userId },
              outcome: "success",
              severity: action === "auth.2fa.disabled" ? "warning" : "info",
              context: extractContext(ctx),
              metadata: { provider: "better-auth", source: "user.update.after" },
            });
          }, "user.update.after");
        },
      },
    },
    account: {
      update: {
        after: async (account: HookData, ctx: HookContext) => {
          await safe(async () => {
            if (!ctx) return;
            // The Better Auth /change-password endpoint calls
            // `internalAdapter.updateAccount(id, { password })` on the
            // credential account. Other account updates (link, refresh OAuth
            // token) must NOT emit a password-changed event.
            const providerId = account.providerId;
            const hasPasswordWrite =
              typeof account.password === "string" && account.password.length > 0;
            const path = typeof ctx.path === "string" ? ctx.path : "";

            // We trust either:
            //   1. an explicit /change-password (or /reset-password) endpoint
            //   2. an account.update on the credential provider that wrote the
            //      password column.
            const credentialAccount = providerId === undefined || providerId === "credential";
            const fromPasswordEndpoint =
              path.endsWith("/change-password") ||
              path.endsWith("/reset-password") ||
              path.endsWith("/set-password");

            if (!fromPasswordEndpoint && !(credentialAccount && hasPasswordWrite)) return;

            const userId = resolveUserIdFromAccount(account, ctx);
            if (!userId) return;

            const tenantId = resolveTenantId(ctx, userId);
            await emitAuditEvent({
              actor: buildActor(ctx, userId),
              tenantId,
              action: "auth.password.changed",
              resource: { type: "user", id: userId },
              outcome: "success",
              severity: "warning",
              context: extractContext(ctx),
              metadata: { provider: "better-auth", source: "account.update.after" },
            });
          }, "account.update.after");
        },
      },
    },
  };
}

// ─── Helpers ───

function resolveUserIdFromAccount(account: HookData, ctx: HookContext): string | undefined {
  if (typeof account.userId === "string") return account.userId;
  const sessionUser = ctx?.context?.session?.user;
  if (sessionUser && typeof sessionUser.id === "string") return sessionUser.id;
  return undefined;
}

function resolveTenantId(ctx: HookContext, userId: string): string {
  // Prefer the active organization on the session — the project's tenant
  // invariant requires every audit row to carry a tenant. Fall back to userId
  // for account-scoped events (matches `getAuditableContext` behavior).
  const session = ctx?.context?.session?.session;
  if (session) {
    const orgId =
      (typeof session.activeOrganizationId === "string" && session.activeOrganizationId) ||
      (typeof session.organizationId === "string" && session.organizationId);
    if (orgId) return orgId;
  }
  return userId;
}

function buildActor(
  ctx: HookContext,
  userId: string,
  user?: HookData,
): { id: string; type: "user"; email?: string; name?: string } {
  const sessionUser = ctx?.context?.session?.user;
  const email =
    (sessionUser && typeof sessionUser.email === "string" && sessionUser.email) ||
    (user && typeof user.email === "string" ? user.email : undefined);
  const name =
    (sessionUser && typeof sessionUser.name === "string" && sessionUser.name) ||
    (user && typeof user.name === "string" ? user.name : undefined);
  return {
    id: userId,
    type: "user",
    ...(email ? { email } : {}),
    ...(name ? { name } : {}),
  };
}

function extractContext(ctx: HookContext): {
  ip?: string;
  userAgent?: string;
  requestId?: string;
  sessionId?: string;
} {
  const headers: Headers | undefined = ctx?.headers ?? ctx?.request?.headers;
  const xff = headers?.get("x-forwarded-for") ?? undefined;
  const ip = xff?.split(",")[0]?.trim() ?? headers?.get("x-real-ip") ?? undefined;
  const userAgent = headers?.get("user-agent") ?? undefined;
  const requestId =
    headers?.get("x-request-id") ??
    headers?.get("x-vercel-id") ??
    headers?.get("x-amzn-trace-id") ??
    undefined;
  const sess = ctx?.context?.session?.session;
  const sessionId =
    sess &&
    (typeof sess.id === "string"
      ? sess.id
      : typeof sess.token === "string"
        ? sess.token
        : undefined);
  return {
    ...(ip ? { ip } : {}),
    ...(userAgent ? { userAgent } : {}),
    ...(requestId ? { requestId } : {}),
    ...(sessionId ? { sessionId } : {}),
  };
}

async function safe(fn: () => Promise<void>, label: string): Promise<void> {
  try {
    await fn();
  } catch (error) {
    // Hooks must NEVER throw — Better Auth would surface the error to the
    // caller and break otherwise-successful auth flows.
    logger.error(`[audit-hooks] ${label} failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

interface AuditEmitInput {
  actor: { id: string; type: "user"; email?: string; name?: string };
  tenantId: string;
  action: "auth.password.changed" | "auth.2fa.enabled" | "auth.2fa.disabled";
  resource: { type: string; id: string };
  outcome: "success" | "failure" | "denied";
  severity: "info" | "warning" | "critical";
  context: { ip?: string; userAgent?: string; requestId?: string; sessionId?: string };
  metadata?: Record<string, unknown>;
}

async function emitAuditEvent(input: AuditEmitInput): Promise<void> {
  // Lazy import — `@nebutra/audit` may not be available in every consumer
  // (e.g. unit tests for unrelated modules). When absent, log + skip.
  let auditModule: typeof import("@nebutra/audit");
  try {
    auditModule = await import("@nebutra/audit");
  } catch (error) {
    logger.warn("[audit-hooks] @nebutra/audit not available — event dropped", {
      action: input.action,
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }

  const { AuditEventInputSchema, getAuditProvider } = auditModule;

  const parsed = AuditEventInputSchema.parse({
    actor: input.actor,
    tenantId: input.tenantId,
    action: input.action,
    resource: input.resource,
    outcome: input.outcome,
    severity: input.severity,
    context: input.context,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });

  const event = {
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
}
