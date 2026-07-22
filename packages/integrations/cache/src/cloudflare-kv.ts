import type { CacheClient, ScanOptions, SetOptions } from "./types.js";

/**
 * Cloudflare KV adapter (HTTP API).
 *
 * Works from Node (ECS/origin) and any runtime that can call the Cloudflare API.
 * Env:
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN   (or CLOUDFLARE_KV_API_TOKEN)
 *   CF_KV_NAMESPACE_ID     (or CLOUDFLARE_KV_NAMESPACE_ID)
 *
 * Note: KV is eventually consistent and has no Lua. `eval` throws so callers
 * (e.g. circuit breaker) fall back to their local/in-process path.
 */

export interface CloudflareKvConfig {
  accountId: string;
  apiToken: string;
  namespaceId: string;
}

export function getCloudflareKvConfig(env: NodeJS.ProcessEnv = process.env): CloudflareKvConfig {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";
  const apiToken = env.CLOUDFLARE_KV_API_TOKEN?.trim() || env.CLOUDFLARE_API_TOKEN?.trim() || "";
  const namespaceId =
    env.CF_KV_NAMESPACE_ID?.trim() || env.CLOUDFLARE_KV_NAMESPACE_ID?.trim() || "";

  if (!accountId || !apiToken || !namespaceId) {
    throw new Error(
      "[cache:cloudflare-kv] Missing CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN (or CLOUDFLARE_KV_API_TOKEN), and CF_KV_NAMESPACE_ID",
    );
  }

  return { accountId, apiToken, namespaceId };
}

function serialize(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function deserialize<T>(raw: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

export class CloudflareKvCacheClient implements CacheClient {
  private readonly accountId: string;
  private readonly apiToken: string;
  private readonly namespaceId: string;
  private readonly baseUrl: string;

  constructor(config?: CloudflareKvConfig) {
    const resolved = config ?? getCloudflareKvConfig();
    this.accountId = resolved.accountId;
    this.apiToken = resolved.apiToken;
    this.namespaceId = resolved.namespaceId;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/storage/kv/namespaces/${this.namespaceId}`;
  }

  private async api(
    path: string,
    init: RequestInit = {},
  ): Promise<{ ok: boolean; status: number; text: string }> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        ...(init.headers ?? {}),
      },
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  }

  async get<T>(key: string): Promise<T | null> {
    const res = await this.api(`/values/${encodeURIComponent(key)}`, { method: "GET" });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(
        `[cache:cloudflare-kv] GET failed (${res.status}): ${res.text.slice(0, 200)}`,
      );
    }
    if (!res.text) return null;
    return deserialize<T>(res.text);
  }

  async set(key: string, value: unknown, opts?: SetOptions): Promise<"OK" | null> {
    // Conditional sets: emulate NX/XX with a prior GET (best-effort; not fully atomic).
    if (opts?.nx || opts?.xx) {
      const existing = await this.get(key);
      if (opts.nx && existing !== null) return null;
      if (opts.xx && existing === null) return null;
    }

    const qs = new URLSearchParams();
    // Cloudflare KV requires expiration_ttl >= 60 seconds.
    if (opts?.ex !== undefined) qs.set("expiration_ttl", String(Math.max(60, opts.ex)));
    if (opts?.px !== undefined) {
      qs.set("expiration_ttl", String(Math.max(60, Math.ceil(opts.px / 1000))));
    }

    const query = qs.toString() ? `?${qs.toString()}` : "";
    const res = await this.api(`/values/${encodeURIComponent(key)}${query}`, {
      method: "PUT",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: serialize(value),
    });
    if (!res.ok) {
      throw new Error(
        `[cache:cloudflare-kv] SET failed (${res.status}): ${res.text.slice(0, 200)}`,
      );
    }
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    let removed = 0;
    // Bulk delete API: POST /bulk with JSON array of keys
    const res = await this.api("/bulk", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keys),
    });
    if (res.ok) {
      try {
        const parsed = JSON.parse(res.text) as {
          success?: boolean;
          result?: { successful_key_count?: number };
        };
        if (typeof parsed.result?.successful_key_count === "number") {
          return parsed.result.successful_key_count;
        }
      } catch {
        /* fall through */
      }
      return keys.length;
    }
    // Fallback: delete one by one
    for (const key of keys) {
      const one = await this.api(`/values/${encodeURIComponent(key)}`, { method: "DELETE" });
      if (one.ok || one.status === 404) removed += one.status === 404 ? 0 : 1;
    }
    return removed;
  }

  async ping(): Promise<string> {
    // Write + read a short-lived probe key to prove credentials + namespace work.
    const probe = `__nebutra_ping__${Date.now()}`;
    await this.set(probe, "1", { ex: 60 });
    const v = await this.get<string>(probe);
    if (v === null) throw new Error("[cache:cloudflare-kv] ping read-back failed");
    await this.del(probe);
    return "PONG";
  }

  async scan(cursor: string | number, options?: ScanOptions): Promise<[string, string[]]> {
    const qs = new URLSearchParams();
    const cur = String(cursor);
    if (cur && cur !== "0") qs.set("cursor", cur);
    if (options?.match) {
      // KV list uses prefix, not glob. Strip trailing * for common "prefix*" patterns.
      const prefix = options.match.replace(/\*+$/, "").replace(/^\*/, "");
      if (prefix && !prefix.includes("*")) qs.set("prefix", prefix);
    }
    if (options?.count) qs.set("limit", String(options.count));

    const res = await this.api(`/keys?${qs.toString()}`, { method: "GET" });
    if (!res.ok) {
      throw new Error(
        `[cache:cloudflare-kv] LIST failed (${res.status}): ${res.text.slice(0, 200)}`,
      );
    }
    const parsed = JSON.parse(res.text) as {
      result?: Array<{ name: string }>;
      result_info?: { cursor?: string };
    };
    const keys = (parsed.result ?? []).map((r) => r.name);
    const next = parsed.result_info?.cursor ? String(parsed.result_info.cursor) : "0";
    return [next, keys];
  }

  async incr(key: string): Promise<number> {
    return this.incrby(key, 1);
  }

  async incrby(key: string, n: number): Promise<number> {
    // Best-effort non-atomic increment (KV has no INCR). Acceptable for metering/rate soft paths.
    const current = await this.get<number | string>(key);
    const base =
      typeof current === "number"
        ? current
        : current === null
          ? 0
          : Number.parseInt(String(current), 10) || 0;
    const next = base + n;
    await this.set(key, next);
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const value = await this.get(key);
    if (value === null) return 0;
    await this.set(key, value, { ex: seconds });
    return 1;
  }

  async eval(_script: string, _keys: string[], _args: Array<string | number>): Promise<unknown> {
    // Circuit breakers and similar features catch this and fall back to local state.
    throw new Error(
      "[cache:cloudflare-kv] EVAL is not supported on Cloudflare KV. Use Upstash/ioredis for Lua, or local fallback.",
    );
  }
}
