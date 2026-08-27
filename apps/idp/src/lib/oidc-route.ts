import type { IncomingHttpHeaders, OutgoingHttpHeader } from "node:http";
import { PassThrough } from "node:stream";
import type { NextRequest } from "next/server";

type RouteHandlerOptions = {
  mountPath?: string;
};

function providerPathFor(pathname: string, mountPath: string): string {
  if (!mountPath) return pathname || "/";
  if (!pathname.startsWith(mountPath)) return pathname || "/";
  return pathname.slice(mountPath.length) || "/";
}

function requestHeadersFor(req: NextRequest): IncomingHttpHeaders {
  const headers: IncomingHttpHeaders = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
}

function setResponseHeader(
  store: Map<string, OutgoingHttpHeader>,
  headers: Headers,
  name: string,
  value: OutgoingHttpHeader,
): void {
  const normalizedName = name.toLowerCase();
  store.set(normalizedName, value);
  headers.delete(normalizedName);

  if (Array.isArray(value)) {
    for (const item of value) {
      headers.append(normalizedName, String(item));
    }
    return;
  }

  headers.set(normalizedName, String(value));
}

function applyHeaders(
  store: Map<string, OutgoingHttpHeader>,
  headers: Headers,
  values?: Record<string, OutgoingHttpHeader>,
): void {
  if (!values) return;

  for (const [name, value] of Object.entries(values)) {
    setResponseHeader(store, headers, name, value);
  }
}

/**
 * Delegates a Next.js route handler request into oidc-provider's Node/Koa
 * callback. The public IdP exposes standard root OIDC paths; `/api/oidc/*`
 * stays as a legacy-compatible mount through `mountPath`.
 */
export async function handleOIDC(
  req: NextRequest,
  { mountPath = "" }: RouteHandlerOptions = {},
): Promise<Response> {
  const { getOIDCProvider } = await import("@/lib/oidc");
  const provider = getOIDCProvider();
  const callback = provider.callback();

  const url = new URL(req.url);
  const path = providerPathFor(url.pathname, mountPath);
  const body = req.method !== "GET" && req.method !== "HEAD" ? await req.text() : "";

  return new Promise<Response>((resolve) => {
    const mockReq = new PassThrough();
    Object.assign(mockReq, {
      method: req.method,
      url: path + url.search,
      headers: requestHeadersFor(req),
      socket: { encrypted: url.protocol === "https:" },
      connection: { encrypted: url.protocol === "https:" },
    });
    mockReq.end(body ? Buffer.from(body) : undefined);

    const chunks: Buffer[] = [];
    const responseHeaders = new Headers();
    const headerStore = new Map<string, OutgoingHttpHeader>();

    const mockRes = {
      statusCode: 200,
      headersSent: false,
      writableEnded: false,
      setHeader(name: string, value: OutgoingHttpHeader) {
        setResponseHeader(headerStore, responseHeaders, name, value);
        return mockRes;
      },
      getHeader(name: string) {
        return headerStore.get(name.toLowerCase());
      },
      getHeaderNames() {
        return Array.from(headerStore.keys());
      },
      hasHeader(name: string) {
        return headerStore.has(name.toLowerCase());
      },
      removeHeader(name: string) {
        const normalizedName = name.toLowerCase();
        headerStore.delete(normalizedName);
        responseHeaders.delete(normalizedName);
        return mockRes;
      },
      writeHead(
        code: number,
        reasonOrHeaders?: string | Record<string, OutgoingHttpHeader>,
        maybeHeaders?: Record<string, OutgoingHttpHeader>,
      ) {
        mockRes.statusCode = code;
        mockRes.headersSent = true;
        applyHeaders(
          headerStore,
          responseHeaders,
          typeof reasonOrHeaders === "string" ? maybeHeaders : reasonOrHeaders,
        );
        return mockRes;
      },
      write(chunk: string | Buffer, callback?: (error?: Error | null) => void) {
        chunks.push(Buffer.from(chunk));
        callback?.();
        return true;
      },
      end(chunk?: string | Buffer, callback?: () => void) {
        if (chunk) chunks.push(Buffer.from(chunk));
        mockRes.writableEnded = true;
        callback?.();

        const responseBody = Buffer.concat(chunks);
        resolve(
          new Response(responseBody.length > 0 ? responseBody : null, {
            status: mockRes.statusCode,
            headers: responseHeaders,
          }),
        );
        return mockRes;
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

    Promise.resolve(
      // biome-ignore lint/suspicious/noExplicitAny: oidc-provider expects Node.js req/res instances.
      callback(mockReq as any, mockRes as any),
    ).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "OIDC provider request failed";
      resolve(
        Response.json(
          { error: "oidc_provider_error", error_description: message },
          { status: 500 },
        ),
      );
    });
  });
}
