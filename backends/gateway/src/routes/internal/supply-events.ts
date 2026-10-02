import { verifyServiceToken } from "@nebutra/auth";
import { logger } from "@nebutra/logger";
import { Hono } from "hono";
import { inngest } from "../../inngest/client.js";

/**
 * Router → gateway event relay (ADR 2026-09-30, "Event-driven execution").
 *
 * Router's own process holds no `INNGEST_EVENT_KEY` — only the gateway does
 * (`backends/gateway/src/config/env.ts`; Router's `.env.example` never names
 * it). Rather than hand Router a second secret purely to call Inngest
 * directly, it posts the event here and the gateway (which already has the
 * key) sends it on Router's behalf. Zero new secret: this endpoint trusts the
 * exact same zero-context service token `apps/router/src/lib/
 * internal-service.ts`'s `verifyInternalServiceCaller` already accepts for
 * "Nebutra infrastructure calling itself" (`signServiceToken({},
 * SERVICE_SECRET)`, `verifyServiceToken(token)` with no expected claims) —
 * the mirror image of that relay, not a new primitive.
 *
 * Deliberately NOT behind `tenantContextMiddleware`'s staff ladder
 * (`x-user-id` / `x-role`, `apps/router/src/lib/admin/service-token.ts`
 * `gateStaff`): this is a service-to-service event post, not an admin action,
 * so it asks for nothing beyond "this request really came from Nebutra's own
 * infrastructure."
 */

const KNOWN_SUPPLY_EVENTS = new Set([
  "supply/source.changed",
  "supply/model.discovered",
  "supply/model.signal",
  "supply/probe.requested",
  "supply/bootstrap",
]);

export function isSupplyEventName(name: unknown): name is string {
  return typeof name === "string" && KNOWN_SUPPLY_EVENTS.has(name);
}

export const supplyEventsRoutes = new Hono();

supplyEventsRoutes.post("/events", async (c) => {
  const token = c.req.header("x-service-token");
  const authorized = await verifyServiceToken(token);
  if (!authorized) {
    return c.json({ error: "unauthenticated", message: "Service token rejected." }, 401);
  }

  const body = await c.req.json().catch(() => null);
  const name = (body as { name?: unknown } | null)?.name;
  if (!isSupplyEventName(name)) {
    return c.json(
      { error: "invalid_input", message: "body.name must be a known supply/* event." },
      400,
    );
  }
  const rawData = (body as { data?: unknown }).data;
  const data = rawData && typeof rawData === "object" ? rawData : {};

  try {
    const result = await inngest.send({ name, data } as Parameters<typeof inngest.send>[0]);
    const ids = (result as { ids?: string[] }).ids ?? [];
    return c.json({ ok: true, ids }, 202);
  } catch (error) {
    logger.error("[supply-events] send failed", {
      name,
      error: error instanceof Error ? error.message : "unknown",
    });
    return c.json({ error: "send_failed", message: "Failed to enqueue the event." }, 502);
  }
});
