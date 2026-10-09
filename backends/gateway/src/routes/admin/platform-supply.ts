/**
 * /api/v1/admin/platform/supply — the platform control plane's browser door
 * into CLIProxyAPI's management UI.
 *
 * Ported from apps/admin/src/lib/supply.ts + supply-route.ts and its three
 * route handlers (`app/management.html/route.ts`,
 * `app/v0/management/[...path]/route.ts`, `app/oauth-callback/route.ts`).
 * This is the one apps/admin surface that stays a proxy endpoint rather than
 * becoming a Next Server Action in @nebutra/web: it streams an arbitrary
 * HTML console and an arbitrary-shaped management API through, which a
 * Server Action's serializable-return contract cannot express. Per
 * CLAUDE.md, that kind of business endpoint belongs in backends/gateway, not
 * an apps/web route handler — so it lives here instead.
 *
 * MOUNTED SEPARATELY FROM `./index.ts`'s `adminRoutes`.
 *
 * `adminRoutes` gates everything on `X-Admin-Key`, which only internal
 * tooling holds — a browser tab can never send it. This router is gated by
 * `requireStaffFromRequest` (Cloudflare Access + PlatformStaff) instead, the
 * same check @nebutra/web's /admin/platform pages use. See
 * docs/architecture/2026-09-29-admin-into-web.md: for this to work in
 * production the gateway's own public host needs a Cloudflare Access policy
 * on this path (or GATEWAY_MODE=embedded puts it on the same host as
 * /admin/platform, in which case one Access policy covering both paths is
 * enough) — that Access policy is an owner action, not done by this change.
 */

import { brand } from "@nebutra/brand/metadata";
import { Hono } from "hono";
import { requireStaffFromRequest, StaffAccessError } from "./platform-guard.js";

export const platformSupplyRoutes = new Hono();

export const CLIPROXY_INTERNAL_URL = (
  process.env.CLIPROXY_INTERNAL_URL ?? "http://nebutra-cliproxyapi.internal:8317"
).replace(/\/+$/, "");

class SupplyConfigError extends Error {}

function managementKey(): string {
  const key = process.env.CLIPROXY_MANAGEMENT_KEY?.trim();
  if (!key) throw new SupplyConfigError("CLIPROXY_MANAGEMENT_KEY is not set on this Machine.");
  return key;
}

const FORWARDED = ["content-type", "accept", "accept-language"] as const;

/** Transitional skin for the engine's bundled console — unchanged from the
 * original (see apps/admin/src/lib/supply.ts for the full rationale). */
function rebrandManagementConsole(html: string): string {
  const note = [
    '<style id="nebutra-skin">',
    "  :root { color-scheme: light dark; }",
    // allow-z-index: injected into CLIProxyAPI's own console, which has no tokens
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

/** Forward one request to CLIProxyAPI's management surface with the
 * management key injected. Streams the body through; strips hop-by-hop
 * headers. */
async function proxyToCliProxy(request: Request, targetPath: string): Promise<Response> {
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

  const response = await fetch(upstream, init);
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

async function handle(request: Request, targetPath: string): Promise<Response> {
  try {
    return await proxyToCliProxy(request, targetPath);
  } catch (error) {
    if (error instanceof SupplyConfigError) {
      return Response.json({ error: error.message }, { status: 503 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "upstream_failed" },
      { status: 503 },
    );
  }
}

platformSupplyRoutes.all("*", async (c) => {
  // Re-checked on every request, same as apps/admin's proxyToCliProxy() did
  // via requireStaff() before every proxied call.
  try {
    await requireStaffFromRequest(c);
  } catch (error) {
    if (error instanceof StaffAccessError) {
      return c.json({ error: "Not a platform staff member." }, 403);
    }
    throw error;
  }

  const path = c.req.path.replace(/^\/api\/v1\/admin\/platform\/supply/, "") || "/";
  const targetPath =
    path === "/" || path === "/management.html"
      ? "/management.html"
      : path === "/oauth-callback"
        ? "/oauth-callback"
        : `/v0/management${path}`;
  return handle(c.req.raw, targetPath);
});
