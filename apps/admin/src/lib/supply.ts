import "server-only";

import { requireStaff } from "./staff";

/**
 * Supply desk — the control plane's door into the Router supply engines.
 *
 * Both engines are private Fly Machines with no public hostname. Staff reach
 * them only through this app: Cloudflare Access authenticates at the edge,
 * PlatformStaff authorises here, and the engine-native secret is injected by
 * the proxy so nobody has to hold it. The engines stay unreachable from the
 * internet, which is the rule in infra/nebutra-router/README.md.
 */

export const CLIPROXY_INTERNAL_URL = (
  process.env.CLIPROXY_INTERNAL_URL ?? "http://nebutra-cliproxyapi.internal:8317"
).replace(/\/+$/, "");

export const NEW_API_INTERNAL_URL = (
  process.env.NEW_API_INTERNAL_URL ?? "http://nebutra-new-api.internal:3000"
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
  return new Response(response.body as BodyInit | null, {
    status: response.status,
    statusText: response.statusText,
    headers: outgoing,
  });
}

/** Models CLIProxyAPI currently serves — follows the logged-in accounts. */
export async function listCliProxyModels(fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const apiKey = process.env.CLIPROXY_API_KEY?.trim();
  if (!apiKey) throw new SupplyConfigError("CLIPROXY_API_KEY is not set on this Machine.");
  const res = await fetchImpl(`${CLIPROXY_INTERNAL_URL}/v1/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`cliproxyapi /v1/models → ${res.status}`);
  const payload = (await res.json()) as { data?: Array<{ id?: string }> };
  return [
    ...new Set((payload.data ?? []).map((m) => m.id).filter((id): id is string => !!id)),
  ].sort();
}

interface NewApiSession {
  cookie: string;
  userId: string;
}

async function newApiLogin(fetchImpl: typeof fetch): Promise<NewApiSession> {
  const password = process.env.NEW_API_ROOT_PASSWORD?.trim();
  if (!password) throw new SupplyConfigError("NEW_API_ROOT_PASSWORD is not set on this Machine.");
  const res = await fetchImpl(`${NEW_API_INTERNAL_URL}/api/user/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "root", password }),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    message?: string;
    data?: { id?: number | string };
  };
  if (!res.ok || payload.success === false) {
    throw new Error(`New-API login failed: ${payload.message ?? res.status}`);
  }
  const cookie = (res.headers.get("set-cookie") ?? "").split(";")[0] ?? "";
  return { cookie, userId: String(payload.data?.id ?? 1) };
}

async function newApiAdmin<T>(
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
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
  if (!res.ok || payload.success === false) {
    throw new Error(`New-API ${method} ${path} failed: ${payload.message ?? res.status}`);
  }
  return payload as T;
}

export const CLIPROXY_CHANNEL_NAME = "cliproxyapi";

export interface SyncChannelResult {
  action: "created" | "updated";
  models: string[];
}

/**
 * Upsert CLIProxyAPI as an OpenAI-type channel in New-API with the model list
 * it serves right now. Idempotent; run after adding or removing accounts.
 * Priority 0 keeps official-key channels (higher priority) preferred.
 */
export async function syncCliProxyChannel(
  fetchImpl: typeof fetch = fetch,
): Promise<SyncChannelResult> {
  const apiKey = process.env.CLIPROXY_API_KEY?.trim();
  if (!apiKey) throw new SupplyConfigError("CLIPROXY_API_KEY is not set on this Machine.");
  const models = await listCliProxyModels(fetchImpl);
  if (models.length === 0) {
    throw new Error("CLIProxyAPI serves no models yet — add an account first.");
  }

  const session = await newApiLogin(fetchImpl);
  const search = await newApiAdmin<{
    data?: { items?: Array<{ id: number; name: string }> } | Array<{ id: number; name: string }>;
  }>(
    fetchImpl,
    session,
    "GET",
    `/api/channel/search?keyword=${encodeURIComponent(CLIPROXY_CHANNEL_NAME)}`,
  );
  const items = Array.isArray(search.data) ? search.data : (search.data?.items ?? []);
  const existing = items.find((c) => c.name === CLIPROXY_CHANNEL_NAME);

  const channel = {
    type: 1,
    name: CLIPROXY_CHANNEL_NAME,
    key: apiKey,
    base_url: CLIPROXY_INTERNAL_URL,
    models: models.join(","),
    group: "default",
    status: 1,
    priority: 0,
    weight: 1,
    tag: "account-relay",
  };

  if (existing) {
    await newApiAdmin(fetchImpl, session, "PUT", "/api/channel/", { ...channel, id: existing.id });
    return { action: "updated", models };
  }
  await newApiAdmin(fetchImpl, session, "POST", "/api/channel/", channel);
  return { action: "created", models };
}

export interface EngineStatus {
  id: "cliproxyapi" | "new-api";
  reachable: boolean;
  detail: string;
}

/** Cheap liveness for the supply page. Never throws. */
export async function probeEngines(fetchImpl: typeof fetch = fetch): Promise<EngineStatus[]> {
  const probe = async (id: EngineStatus["id"], url: string): Promise<EngineStatus> => {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(4_000) });
      return { id, reachable: res.status < 500, detail: `HTTP ${res.status}` };
    } catch (error) {
      return {
        id,
        reachable: false,
        detail: error instanceof Error ? error.message : "unreachable",
      };
    }
  };
  return Promise.all([
    probe("cliproxyapi", `${CLIPROXY_INTERNAL_URL}/v1/models`),
    probe("new-api", `${NEW_API_INTERNAL_URL}/api/status`),
  ]);
}
