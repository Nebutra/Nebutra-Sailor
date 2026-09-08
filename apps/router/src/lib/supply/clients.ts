import "server-only";

/**
 * Engine clients for the supply domain. Both engines are private Machines;
 * the product (router) is the only thing that holds their secrets.
 */

export class SupplyConfigError extends Error {}

export const CLIPROXY_INTERNAL_URL = (
  process.env.CLIPROXY_INTERNAL_URL ?? "http://nebutra-cliproxyapi.internal:8317"
).replace(/\/+$/, "");
export const NEW_API_INTERNAL_URL = (
  process.env.NEW_API_INTERNAL_URL ??
  (process.env.NEW_API_BASE_URL ?? "http://nebutra-new-api.internal:3000").replace(/\/v1\/?$/, "")
).replace(/\/+$/, "");

export const CLIPROXY_CHANNEL_NAME = "cliproxyapi";

function need(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new SupplyConfigError(`${name} is not set on this Machine.`);
  return v;
}

export interface CliProxyAuthFile {
  id?: string;
  name?: string;
  type?: string;
  provider?: string;
  email?: string;
  account?: string;
  status?: string;
  status_message?: string;
  disabled?: boolean;
  unavailable?: boolean;
  last_refresh?: string;
  updated_at?: string;
  recent_requests?: number;
  quota?: unknown;
  next_retry_after?: string;
}

export async function cliProxyModels(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const res = await fetchImpl(`${CLIPROXY_INTERNAL_URL}/v1/models`, {
    headers: { Authorization: `Bearer ${need("CLIPROXY_API_KEY")}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`cliproxyapi /v1/models → ${res.status}`);
  const payload = (await res.json()) as { data?: Array<{ id?: string }> };
  return [
    ...new Set((payload.data ?? []).map((m) => m.id).filter((id): id is string => !!id)),
  ].sort();
}

export async function cliProxyAuthFiles(
  fetchImpl: typeof fetch = fetch,
): Promise<CliProxyAuthFile[]> {
  const res = await fetchImpl(`${CLIPROXY_INTERNAL_URL}/v0/management/auth-files`, {
    headers: { Authorization: `Bearer ${need("CLIPROXY_MANAGEMENT_KEY")}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`cliproxyapi auth-files → ${res.status}`);
  const payload = (await res.json()) as { files?: CliProxyAuthFile[] } | CliProxyAuthFile[];
  return Array.isArray(payload) ? payload : (payload.files ?? []);
}

interface NewApiSession {
  cookie: string;
  userId: string;
}

export async function newApiLogin(fetchImpl: typeof fetch = fetch): Promise<NewApiSession> {
  const res = await fetchImpl(`${NEW_API_INTERNAL_URL}/api/user/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "root", password: need("NEW_API_ROOT_PASSWORD") }),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: { id?: number | string };
  };
  if (!res.ok || payload.success === false)
    throw new Error(`New-API login failed: ${payload.message ?? res.status}`);
  return {
    cookie: (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "",
    userId: String(payload.data?.id ?? 1),
  };
}

export async function newApiAdmin<T>(
  fetchImpl: typeof fetch,
  session: NewApiSession,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetchImpl(`${NEW_API_INTERNAL_URL}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      cookie: session.cookie,
      "New-Api-User": session.userId,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10_000),
  });
  const payload = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
  if (!res.ok || payload.success === false)
    throw new Error(`New-API ${method} ${path} failed: ${payload.message ?? res.status}`);
  return payload as T;
}

export interface NewApiChannel {
  id: number;
  name: string;
  models?: string;
  status?: number;
}

export async function newApiFindChannel(
  fetchImpl: typeof fetch,
  session: NewApiSession,
  name: string,
): Promise<NewApiChannel | null> {
  const search = await newApiAdmin<{ data?: { items?: NewApiChannel[] } | NewApiChannel[] }>(
    fetchImpl,
    session,
    "GET",
    `/api/channel/search?keyword=${encodeURIComponent(name)}`,
  );
  const items = Array.isArray(search.data) ? search.data : (search.data?.items ?? []);
  return items.find((c) => c.name === name) ?? null;
}

/** Models New-API sells right now (the customer-visible shelf). */
export async function newApiShelf(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const token = need("NEW_API_ACCESS_TOKEN");
  const res = await fetchImpl(`${NEW_API_INTERNAL_URL}/v1/models`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`New-API /v1/models → ${res.status}`);
  const payload = (await res.json()) as { data?: Array<{ id?: string; owned_by?: string }> };
  return [
    ...new Set((payload.data ?? []).map((m) => m.id).filter((id): id is string => !!id)),
  ].sort();
}
