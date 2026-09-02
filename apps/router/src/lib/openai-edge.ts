import { openaiCompatibleUrl } from "@nebutra/router-supply";

export class RouterSupplyUnavailableError extends Error {
  constructor(message = "router_unconfigured") {
    super(message);
    this.name = "RouterSupplyUnavailableError";
  }
}

export function newApiBaseUrl(): string {
  return (process.env.NEW_API_BASE_URL || process.env.NEBUTRA_NEW_API_URL || "").replace(/\/$/, "");
}

export function isRouterSupplyConfigured(): boolean {
  return Boolean(newApiBaseUrl());
}

export function requireRouterSupply(): void {
  if (!isRouterSupplyConfigured()) {
    throw new RouterSupplyUnavailableError();
  }
}

/**
 * Transparent OpenAI-compatible forward to New-API.
 *
 * Request shape is the 302.ai / OpenAI contract: same path under /v1, same
 * method, query, Content-Type, and body. Authorization is the router product
 * key (a New-API user token), not the upstream 302.ai channel key.
 */
export async function proxyOpenAiCompatible(
  request: Request,
  path: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  requireRouterSupply();

  const incomingAuth = request.headers.get("authorization");
  if (!incomingAuth?.toLowerCase().startsWith("bearer ")) {
    return Response.json(
      { error: { message: "Missing bearer token", type: "invalid_request_error" } },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const upstream = openaiCompatibleUrl(newApiBaseUrl(), path, url.search);
  const headers = new Headers();
  headers.set("Authorization", incomingAuth);
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    signal: AbortSignal.timeout(180_000),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    Object.assign(init, { duplex: "half" });
  }

  const upstreamResponse = await fetchImpl(upstream, init);
  const outgoing = new Headers(upstreamResponse.headers);
  outgoing.delete("content-encoding");
  outgoing.delete("transfer-encoding");
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: outgoing,
  });
}

export function openaiError(status: number, message: string): Response {
  return Response.json(
    { error: { message, type: status >= 500 ? "server_error" : "invalid_request_error" } },
    { status },
  );
}
