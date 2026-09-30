import { signServiceToken } from "@nebutra/auth";
import { logger } from "@nebutra/logger";

/**
 * Calls Router's own supply admin actions (ADR 2026-09-30 supply capability
 * probing) from the gateway's Inngest cron — the same
 * `SERVICE_SECRET`-signed, staff-role service token Router's admin surface
 * already verifies (`apps/router/src/lib/admin/service-token.ts`
 * `gateStaff`), and the same "gateway mints, Router verifies" relay this
 * codebase already uses for the AI gateway's Router upstream
 * (`backends/gateway/src/routes/ai/gateway.ts` `routerUpstream`).
 *
 * Why HTTP instead of importing Router's orchestration code directly: the
 * discovery/verification/state-machine logic already has exactly one
 * implementation (`@nebutra/router-supply` + `@nebutra/repositories`
 * `RouterSupplyRepository`) — what is *not* shared is `apps/router/src/lib/
 * supply/capability.ts`'s credential wiring (env vars naming CLIProxyAPI's and
 * New-API's Fly-internal hosts, which only Router's own Machine holds) and
 * its admin-action plumbing (audit logging bound to a `Request`). Next.js app
 * code is not an importable package, so re-running that wiring from a second
 * process means either duplicating it or calling the one process that already
 * has it. This calls it.
 *
 * Zero new secrets: `SERVICE_SECRET` is already present on both Fly apps
 * (guarded against drift by the `ci(infra)` check landed just before this
 * ADR), so no owner-issued token is needed for the schedule to run.
 */

const DEFAULT_ROUTER_INTERNAL_URL = "http://nebutra-router.internal:8080";

function routerInternalUrl(): string {
  return (process.env.NEBUTRA_ROUTER_INTERNAL_URL ?? DEFAULT_ROUTER_INTERNAL_URL).replace(
    /\/+$/,
    "",
  );
}

const STAFF_ROLE = "platform_operator";
const STAFF_USER_ID = "system:supply-scheduler";

export interface SupplyActionResult {
  readonly ok: boolean;
  readonly status: number;
  readonly body: unknown;
}

/**
 * POST one supply admin action (`source.add`, `source.probe`, `discovery.run`,
 * `probe.idle`, `probe.suspended`, …) as the scheduler's own staff identity.
 * Never throws — a failed background sweep must not crash the Inngest step;
 * it logs and returns `ok: false` for the caller to decide whether to retry.
 */
export async function callSupplyAction(
  actionId: string,
  input: Record<string, unknown> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<SupplyActionResult> {
  const secret = process.env.SERVICE_SECRET;
  if (!secret) {
    logger.warn("[supply-scheduler] SERVICE_SECRET not set — skipping", { actionId });
    return { ok: false, status: 0, body: { error: "SERVICE_SECRET not configured" } };
  }
  try {
    const token = await signServiceToken({ userId: STAFF_USER_ID, role: STAFF_ROLE }, secret);
    const res = await fetchImpl(`${routerInternalUrl()}/api/admin/v1/supply/actions/${actionId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-service-token": token,
        "x-user-id": STAFF_USER_ID,
        "x-role": STAFF_ROLE,
      },
      body: JSON.stringify({ mode: "apply", input }),
      signal: AbortSignal.timeout(60_000),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      logger.error("[supply-scheduler] action failed", { actionId, status: res.status, body });
    }
    return { ok: res.ok, status: res.status, body };
  } catch (error) {
    logger.error("[supply-scheduler] action errored", {
      actionId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      status: 0,
      body: { error: error instanceof Error ? error.message : "unknown" },
    };
  }
}
