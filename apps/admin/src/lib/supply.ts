import "server-only";

import { brand } from "@nebutra/brand/metadata";

import { requireStaff } from "./staff";

/**
 * Supply desk — the browser door into CLIProxyAPI's management UI.
 *
 * This is the manifest `slot` for the router's supply domain: a product-owned
 * surface the generic renderer cannot express. Everything else about supply
 * (engines, accounts, shelf, channel sync) is a contract call to the router
 * and lives in apps/router/src/lib/supply. Only the proxy stays here, because
 * it is a browser surface: Cloudflare Access authenticates at the edge,
 * PlatformStaff authorises here, and the management key is injected so nobody
 * has to hold it. The engine stays unreachable from the internet, which is the
 * rule in infra/nebutra-router/README.md.
 */

export const CLIPROXY_INTERNAL_URL = (
  process.env.CLIPROXY_INTERNAL_URL ?? "http://nebutra-cliproxyapi.internal:8317"
).replace(/\/+$/, "");

export class SupplyConfigError extends Error {}

function managementKey(): string {
  const key = process.env.CLIPROXY_MANAGEMENT_KEY?.trim();
  if (!key) throw new SupplyConfigError("CLIPROXY_MANAGEMENT_KEY is not set on this Machine.");
  return key;
}

const FORWARDED = ["content-type", "accept", "accept-language"] as const;

/**
 * Forward one request to CLIProxyAPI's management surface with the management
 * key injected. Streams the body through; strips hop-by-hop headers.
 */
export async function proxyToCliProxy(
  request: Request,
  targetPath: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  await requireStaff();
  const url = new URL(request.url);
  const upstream = `${CLIPROXY_INTERNAL_URL}${targetPath}${url.search}`;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${managementKey()}`);
  for (const name of FORWARDED) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = {
    method: request.method,
    headers,
    signal: AbortSignal.timeout(60_000),
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    Object.assign(init, { duplex: "half" });
  }

  const response = await fetchImpl(upstream, init);
  const outgoing = new Headers(response.headers);
  outgoing.delete("content-encoding");
  outgoing.delete("transfer-encoding");
  outgoing.delete("content-security-policy");
  outgoing.delete("content-length");

  if (targetPath === "/management.html" && response.ok) {
    const html = rebrandManagementConsole(await response.text());
    outgoing.set("content-type", "text/html; charset=utf-8");
    return new Response(html, { status: response.status, headers: outgoing });
  }
  return new Response(response.body as BodyInit | null, {
    status: response.status,
    statusText: response.statusText,
    headers: outgoing,
  });
}

/**
 * Transitional skin for the engine's bundled console. It stays reachable as
 * the "advanced" entry, but it must not present itself as a separate product
 * with its own login: the proxy already injects the management key, so the
 * console's key prompt accepts any value — say so where the prompt appears.
 * Everyday account work happens in /supply; see AddAccountDialog.
 */
export function rebrandManagementConsole(html: string): string {
  const note = [
    '<style id="nebutra-skin">',
    "  :root { color-scheme: light dark; }",
    "  #nebutra-note { position: fixed; top: 0; left: 0; right: 0; z-index: 2147483647;",
    "    font: 12px/18px system-ui, sans-serif; padding: 6px 12px; text-align: center;",
    "    background: #171717; color: #fff; }",
    "  body { padding-top: 30px !important; }",
    "</style>",
    `<div id="nebutra-note">${brand.name} Admin · 引擎原生控制台（高级）。鉴权已由 ${brand.name} 代理注入，登录框可填任意值。日常操作请回到 /supply。</div>`,
  ].join("\n");
  return html
    .replace(/<title>[^<]*<\/title>/i, `<title>${brand.name} Admin · 引擎控制台</title>`)
    .replace(/<body([^>]*)>/i, (_m, attrs: string) => `<body${attrs}>${note}`);
}
