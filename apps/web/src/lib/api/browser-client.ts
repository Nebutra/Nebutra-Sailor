import createClient, { type Middleware } from "openapi-fetch";

import type { paths } from "./types.generated";

type PublicRuntimeEnv = Partial<
  Record<"VITE_API_GATEWAY_URL" | "NEXT_PUBLIC_API_GATEWAY_URL" | "NEXT_PUBLIC_API_URL", string>
>;

interface ResolveApiBaseUrlOptions {
  viteEnv: PublicRuntimeEnv | undefined;
  nodeEnv: PublicRuntimeEnv | undefined;
}

export function resolveApiBaseUrlFromEnv({ viteEnv, nodeEnv }: ResolveApiBaseUrlOptions): string {
  return (
    viteEnv?.VITE_API_GATEWAY_URL ??
    nodeEnv?.NEXT_PUBLIC_API_GATEWAY_URL ??
    nodeEnv?.NEXT_PUBLIC_API_URL ??
    ""
  );
}

const viteEnv = (import.meta as ImportMeta & { env?: PublicRuntimeEnv }).env;
const nodeEnv =
  typeof process === "undefined"
    ? undefined
    : {
        NEXT_PUBLIC_API_GATEWAY_URL: process.env.NEXT_PUBLIC_API_GATEWAY_URL,
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
      };

export const API_BASE_URL = resolveApiBaseUrlFromEnv({ viteEnv, nodeEnv });

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  if (API_BASE_URL.length === 0) return path.startsWith("/") ? path : `/${path}`;
  const normalizedBase = API_BASE_URL.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function createAuthMiddleware(token: string): Middleware {
  return {
    async onRequest({ request }) {
      request.headers.set("Authorization", `Bearer ${token}`);
      return request;
    },
  };
}

export const browserApiClient = createClient<paths>({
  baseUrl: API_BASE_URL,
});

export function createBrowserApiClient(token?: string | null) {
  const client = createClient<paths>({
    baseUrl: API_BASE_URL,
  });

  if (token) {
    client.use(createAuthMiddleware(token));
  }

  return client;
}
