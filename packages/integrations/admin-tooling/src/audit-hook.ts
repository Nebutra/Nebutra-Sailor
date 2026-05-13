import "server-only";

import { logger } from "@nebutra/logger";

/**
 * Wraps a mutation handler so that every external-admin call automatically
 * writes an audit log entry through @nebutra/audit. The audit package is an
 * optional peer dependency — when absent we still execute the handler but
 * log a single warning so the operator can fix it.
 */

export interface AdminActor {
  userId: string;
  /** Human-friendly source label, e.g. "retool", "forest", "appsmith". */
  toolName: string;
  /** Optional org/tenant the actor is acting within. */
  tenantId?: string;
}

export interface WithAuditHookOptions<TInput> {
  /** Resource name (e.g. "user", "invoice"). */
  resource: string;
  /** Op label — typically MutationOp from contract.ts. */
  op: string;
  /**
   * Resolve the actor from the inbound Request. This is intentionally async
   * so callers can hit Clerk / Better Auth / their own session store.
   */
  actorResolver: (req: Request) => Promise<AdminActor>;
  /** Pull the required `reason` field out of the validated input. */
  reasonExtractor: (input: TInput) => string;
  /**
   * Optional override of the audit category — defaults to "admin_tooling".
   */
  category?: string;
}

type AuditModule = {
  getAuditProvider?: () => Promise<{
    log: (entry: Record<string, unknown>) => Promise<{ id?: string } | void>;
  }>;
};

let auditModuleCache: AuditModule | null | undefined;

async function loadAuditModule(): Promise<AuditModule | null> {
  if (auditModuleCache !== undefined) return auditModuleCache;
  try {
    // Dynamic import so the package does not hard-fail when consumers have
    // not installed @nebutra/audit.
    // Cast via unknown — local AuditModule shape is a deliberately narrower
    // surface than @nebutra/audit's full type; the runtime contract matches.
    const mod = (await import("@nebutra/audit")) as unknown as AuditModule;
    auditModuleCache = mod;
    return mod;
  } catch {
    auditModuleCache = null;
    logger.warn(
      "[admin-tooling] @nebutra/audit not installed — mutations will run without audit trail",
    );
    return null;
  }
}

/**
 * Decorate a handler so every call writes an audit entry. The wrapped
 * function returns the original handler output unchanged.
 */
export function withAuditHook<TInput, TOutput>(
  handler: (input: TInput) => Promise<TOutput>,
  opts: WithAuditHookOptions<TInput>,
): (input: TInput, req: Request) => Promise<TOutput> {
  return async (input: TInput, req: Request): Promise<TOutput> => {
    const startedAt = Date.now();
    let actor: AdminActor | null = null;
    try {
      actor = await opts.actorResolver(req);
    } catch (error) {
      logger.error("[admin-tooling] actorResolver failed", { error: String(error) });
      throw new Error("admin-tooling: failed to resolve actor for audit hook");
    }

    let result: TOutput;
    let outcome: "success" | "failure" = "success";
    let errorMessage: string | undefined;
    try {
      result = await handler(input);
    } catch (error) {
      outcome = "failure";
      errorMessage = error instanceof Error ? error.message : String(error);
      await writeAuditEntry({
        actor,
        opts,
        input,
        outcome,
        errorMessage,
        durationMs: Date.now() - startedAt,
      });
      throw error;
    }

    await writeAuditEntry({
      actor,
      opts,
      input,
      outcome,
      durationMs: Date.now() - startedAt,
    });
    return result;
  };
}

async function writeAuditEntry<TInput>(args: {
  actor: AdminActor;
  opts: WithAuditHookOptions<TInput>;
  input: TInput;
  outcome: "success" | "failure";
  errorMessage?: string;
  durationMs: number;
}): Promise<void> {
  const mod = await loadAuditModule();
  if (!mod?.getAuditProvider) return;
  try {
    const provider = await mod.getAuditProvider();
    await provider.log({
      category: args.opts.category ?? "admin_tooling",
      resource: args.opts.resource,
      op: args.opts.op,
      actorId: args.actor.userId,
      tenantId: args.actor.tenantId,
      toolName: args.actor.toolName,
      reason: args.opts.reasonExtractor(args.input),
      outcome: args.outcome,
      errorMessage: args.errorMessage,
      durationMs: args.durationMs,
      occurredAt: new Date().toISOString(),
    });
  } catch (error) {
    // Audit failures must never break the user-facing operation, but they
    // are serious and need to be loud in logs.
    logger.error("[admin-tooling] audit write failed", { error: String(error) });
  }
}
