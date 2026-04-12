/**
 * OIDC Catch-All Route Handler
 *
 * Mounts oidc-provider on /api/oidc/* which serves all standard endpoints:
 *
 * GET  /api/oidc/.well-known/openid-configuration  → Discovery
 * GET  /api/oidc/auth                               → Authorization
 * POST /api/oidc/token                              → Token exchange
 * GET  /api/oidc/userinfo                           → UserInfo
 * GET  /api/oidc/jwks                               → JWKS
 * POST /api/oidc/token/revocation                   → Revocation
 * POST /api/oidc/token/introspection                → Introspection
 */

import type { NextRequest } from "next/server";

// Force dynamic rendering — OIDC routes require database/Redis at runtime
export const dynamic = "force-dynamic";

/**
 * Converts a Next.js Request into a Node.js-compatible IncomingMessage
 * and delegates to oidc-provider's Koa-based callback.
 */
async function handleOIDC(req: NextRequest): Promise<Response> {
  // Dynamic import to avoid loading prisma/redis at build time
  const { getOIDCProvider } = await import("@/lib/oidc");
  const provider = getOIDCProvider();
  const callback = provider.callback();

  // Build a URL relative to the OIDC mount point
  const url = new URL(req.url);
  const path = url.pathname.replace("/api/oidc", "") || "/";

  // Convert Web API Request to a minimal Node.js-style request
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : undefined;

  return new Promise<Response>((resolve) => {
    // Create a mock Koa-like context for oidc-provider
    const mockReq = {
      method: req.method,
      url: path + url.search,
      headers,
      body,
      socket: { encrypted: url.protocol === "https:" },
    };

    const chunks: Buffer[] = [];
    let statusCode = 200;
    const responseHeaders: Record<string, string> = {};

    const mockRes = {
      statusCode: 200,
      _headers: {} as Record<string, string>,
      setHeader(name: string, value: string) {
        responseHeaders[name.toLowerCase()] = value;
      },
      getHeader(name: string) {
        return responseHeaders[name.toLowerCase()];
      },
      removeHeader(name: string) {
        delete responseHeaders[name.toLowerCase()];
      },
      writeHead(code: number, hdrs?: Record<string, string>) {
        statusCode = code;
        if (hdrs) {
          Object.entries(hdrs).forEach(([k, v]) => {
            responseHeaders[k.toLowerCase()] = v;
          });
        }
      },
      write(chunk: string | Buffer) {
        chunks.push(Buffer.from(chunk));
      },
      end(chunk?: string | Buffer) {
        if (chunk) chunks.push(Buffer.from(chunk));
        statusCode = mockRes.statusCode;

        const responseBody = Buffer.concat(chunks);
        resolve(
          new Response(responseBody.length > 0 ? responseBody : null, {
            status: statusCode,
            headers: responseHeaders,
          }),
        );
      },
      on() {
        return mockRes;
      },
      once() {
        return mockRes;
      },
      emit() {
        return false;
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- oidc-provider expects Node.js req/res shim
    // biome-ignore lint/suspicious/noExplicitAny: oidc provider shim requires any
    callback(mockReq as any, mockRes as any);
  });
}

export const GET = handleOIDC;
export const POST = handleOIDC;
export const PUT = handleOIDC;
export const DELETE = handleOIDC;
