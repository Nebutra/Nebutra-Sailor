import "server-only";

import { verifyServiceToken } from "@nebutra/auth";
import { openaiCompatibleUrl, parseAliasTableJson, resolveAliases } from "@nebutra/router-supply";
import type { InternalRoute } from "./supply/capability";

/**
 * Gate for `POST /api/internal/v1/chat/completions` — Router's own
 * machine-to-machine OpenAI-compatible endpoint. Callers are other Nebutra
 * services (today: backends/gateway's docs assistant and paid AI gateway
 * upstream fallback), never a customer or a browser.
 *
 * The caller mints a short-lived, empty-context service token
 * (`signServiceToken({}, SERVICE_SECRET)`) — the same shape
 * `packages/integrations/saga/src/workflows/orderSaga.ts`'s `gatewayFetch`
 * uses for a call with no tenant context: "this is Nebutra infrastructure
 * calling itself", not any particular tenant/user/role/plan. Verifying with
 * no expected claims (`verifyServiceToken(token)`) is what makes that match:
 * `apps/router/src/lib/admin/service-token.ts`'s `gateStaff` expects
 * `x-user-id` / `x-role` alongside the token for the *staff* ladder; this is
 * a different, narrower caller shape with none of that.
 */
export async function verifyInternalServiceCaller(request: Request): Promise<boolean> {
  // The gateway's upstream loop sends every upstream key as a Bearer token, so
  // accept it there as well as on the dedicated header.
  const bearer = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = request.headers.get("x-service-token") ?? bearer ?? undefined;
  return verifyServiceToken(token);
}

/**
 * Resolve a caller-supplied model id through the public alias table
 * (`NEBUTRA_MODEL_ALIASES` — the same table `@nebutra/router-supply` and the
 * gateway's own `/api/v1/ai/gateway` `GET /models` route read) onto whatever
 * upstream model the `newapi` engine should actually be sent — the only
 * engine this endpoint holds a credential for (`NEW_API_ACCESS_TOKEN`).
 *
 * Falls through to the caller's model unchanged when no alias row names the
 * `newapi` engine for it (including the default alias table's wildcard row,
 * whose `upstreamModel` is `"*"` — "pass the public id through as-is"). That
 * keeps this backward compatible with a caller that already sends a real
 * New-API-recognized id (e.g. `gpt-4o-mini`), which is what
 * `backends/gateway/src/routes/docs/chat.ts` sent before this endpoint
 * existed.
 */
export function resolveNewApiModel(publicModel: string): string {
  const table = parseAliasTableJson(process.env.NEBUTRA_MODEL_ALIASES);
  const row = resolveAliases(table, publicModel).find((entry) => entry.engineId === "newapi");
  if (!row) return publicModel;
  return row.upstreamModel === "*" ? publicModel : row.upstreamModel;
}

/**
 * Forward a chat-completions call straight to an `INTERNAL`-visibility supply
 * source (`resolveInternalRoute` in `./supply/capability`), bypassing New-API
 * entirely. This is deliberately a plain, unbilled relay — no guard, no rate
 * limit, no usage teeing — the same "relay-only mode" posture the New-API leg
 * of this same route already has: this is Nebutra's own infrastructure cost,
 * not customer usage. Kept separate from `proxyOpenAiCompatible`
 * (`openai-edge.ts`) rather than reusing it, because that function always
 * targets `newApiBaseUrl()` — its URL-building is coupled to the one upstream,
 * not parameterized by source, and reworking that for one more caller was a
 * larger, riskier change than a small, dedicated forwarder.
 */
export async function relayToInternalSource(
  route: InternalRoute,
  body: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const url = openaiCompatibleUrl(route.baseUrl, ["chat", "completions"]);
  const upstreamResponse = await fetchImpl(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(route.apiKey ? { Authorization: `Bearer ${route.apiKey}` } : {}),
    },
    body: JSON.stringify({ ...body, model: route.upstreamModel }),
    signal: AbortSignal.timeout(180_000),
  });
  const headers = new Headers(upstreamResponse.headers);
  headers.delete("content-encoding");
  headers.delete("transfer-encoding");
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}
