import "server-only";

import { signServiceToken } from "@nebutra/auth";
import { brand } from "@nebutra/brand/metadata";
import { logger } from "@nebutra/logger";

/**
 * Router → gateway supply event emission (ADR 2026-09-30, "Event-driven
 * execution"). Router's own process never calls Inngest directly: only the
 * gateway's env schema names `INNGEST_EVENT_KEY` /
 * `INNGEST_SIGNING_KEY` (`backends/gateway/src/config/env.ts`) — Router's
 * `.env.example` never has, and handing Router a second Inngest key purely so
 * it could call Inngest's HTTP API itself would be a new owner-set secret for
 * no real gain, since the gateway already has one.
 *
 * So Router posts here instead:
 * `backends/gateway/src/routes/internal/supply-events.ts`, which calls
 * `inngest.send` on Router's behalf. Zero new secret: the request is
 * authenticated with the exact same zero-context service token
 * `apps/router/src/lib/internal-service.ts` already mints for "Nebutra
 * infrastructure calling itself" (`signServiceToken({}, SERVICE_SECRET)`,
 * verified there with `verifyServiceToken(token)` — no expected userId / role
 * / org / plan) — this is the mirror direction of that exact relay, not a new
 * primitive.
 */

export type SupplyEventName =
  | "supply/source.changed"
  | "supply/model.discovered"
  | "supply/model.signal"
  | "supply/probe.requested"
  | "supply/bootstrap";

function gatewayInternalUrl(): string {
  const configured = process.env.NEBUTRA_GATEWAY_INTERNAL_URL?.trim();
  return (configured || `https://${brand.domains.api}`).replace(/\/+$/, "");
}

export interface EmitSupplyEventResult {
  readonly ok: boolean;
  readonly ids: readonly string[];
}

/**
 * Fire-and-forget by convention at the call site (callers `void` this or
 * `await` it only when they need the event id back for a "queued" response,
 * e.g. the `source.probe` admin action) — a failed emit is logged and
 * swallowed, never thrown. A background sweep or a passive-signal hook must
 * never fail the caller's real work because the event bus had a bad moment.
 */
export async function emitSupplyEvent(
  name: SupplyEventName,
  data: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<EmitSupplyEventResult> {
  const secret = process.env.SERVICE_SECRET;
  if (!secret) {
    logger.warn("[router-supply] SERVICE_SECRET not set — cannot emit event", { name });
    return { ok: false, ids: [] };
  }
  try {
    const token = await signServiceToken({}, secret);
    const res = await fetchImpl(`${gatewayInternalUrl()}/api/internal/v1/supply/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-service-token": token },
      body: JSON.stringify({ name, data }),
      signal: AbortSignal.timeout(5_000),
    });
    const body = (await res.json().catch(() => null)) as { ids?: string[] } | null;
    if (!res.ok) {
      logger.error("[router-supply] event emit failed", { name, status: res.status, body });
      return { ok: false, ids: [] };
    }
    return { ok: true, ids: body?.ids ?? [] };
  } catch (error) {
    logger.error("[router-supply] event emit errored", {
      name,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, ids: [] };
  }
}
