import createClient, { type Middleware } from "openapi-fetch";

import type { paths } from "./types.generated";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://localhost:3002";

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
