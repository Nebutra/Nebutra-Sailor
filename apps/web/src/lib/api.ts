/**
 * API Client for Nebutra Web App
 * Communicates with api.nebutra.com (api-gateway)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, token } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new ApiError(response.status, error.message || "Request failed", error);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "POST", body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "PUT", body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "PATCH", body }),

  delete: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

/**
 * Server-side: returns an API client with provider-agnostic JWT auto-injected.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function getAuthenticatedApi() {
  const { createAuth } = await import("@nebutra/auth/server");
  const provider = (process.env.NEXT_PUBLIC_AUTH_PROVIDER || "better-auth") as
    | "clerk"
    | "better-auth";

  const auth = await createAuth({ provider });
  const session = await auth.getSession();

  // For now, we'll use an empty token. In a production setup,
  // you'd call auth.getToken() or similar method if available.
  // The session.userId can be used to mint JWTs server-side if needed.
  const token = session?.userId ? undefined : undefined;

  return {
    get: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
      api.get<T>(endpoint, { ...options, token }),

    post: <T>(
      endpoint: string,
      body?: unknown,
      options?: Omit<RequestOptions, "method" | "body">,
    ) => api.post<T>(endpoint, body, { ...options, token }),

    put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
      api.put<T>(endpoint, body, { ...options, token }),

    patch: <T>(
      endpoint: string,
      body?: unknown,
      options?: Omit<RequestOptions, "method" | "body">,
    ) => api.patch<T>(endpoint, body, { ...options, token }),

    delete: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
      api.delete<T>(endpoint, { ...options, token }),
  };
}

export { ApiError };
export default api;
