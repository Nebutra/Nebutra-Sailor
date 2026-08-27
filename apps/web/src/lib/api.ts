/**
 * API Client for the web app
 * Communicates with brand.domains.api (api-gateway)
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
  const { signServiceToken } = await import("@nebutra/auth");
  const { getAuth } = await import("./auth");
  const { buildServiceAuthHeaders } = await import("./service-auth");

  const { userId, orgId, sessionClaims } = await getAuth();

  const authHeaders = await buildServiceAuthHeaders(
    {
      userId,
      organizationId: orgId,
      role: sessionClaims?.org_role,
      plan: sessionClaims?.org_plan,
    },
    (context) => signServiceToken(context),
  );

  const withAuth = (options?: Omit<RequestOptions, "method" | "body">) => ({
    ...options,
    headers: { ...authHeaders, ...options?.headers },
  });

  return {
    get: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
      api.get<T>(endpoint, withAuth(options)),

    post: <T>(
      endpoint: string,
      body?: unknown,
      options?: Omit<RequestOptions, "method" | "body">,
    ) => api.post<T>(endpoint, body, withAuth(options)),

    put: <T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
      api.put<T>(endpoint, body, withAuth(options)),

    patch: <T>(
      endpoint: string,
      body?: unknown,
      options?: Omit<RequestOptions, "method" | "body">,
    ) => api.patch<T>(endpoint, body, withAuth(options)),

    delete: <T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) =>
      api.delete<T>(endpoint, withAuth(options)),
  };
}

export { ApiError };
export default api;
