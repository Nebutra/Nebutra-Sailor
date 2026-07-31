/**
 * Edge-friendly key/value for status history + incidents.
 *
 * Prefer Upstash Redis REST (independent of ECS origin) so status.nebutra.com
 * can still read history when the app stack is degraded. Falls back to an
 * in-process map for local/dev/test when Redis env is absent.
 */

export interface StatusKv {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  hgetall(key: string): Promise<Record<string, string>>;
  hset(key: string, field: string, value: string): Promise<void>;
  /** Test helper: wipe the backend. */
  clear?(): Promise<void>;
}

const memory = new Map<string, string>();
const memoryHashes = new Map<string, Map<string, string>>();

function memoryKv(): StatusKv {
  return {
    async get(key) {
      return memory.get(key) ?? null;
    },
    async set(key, value) {
      memory.set(key, value);
    },
    async hgetall(key) {
      const hash = memoryHashes.get(key);
      if (!hash) return {};
      return Object.fromEntries(hash.entries());
    },
    async hset(key, field, value) {
      let hash = memoryHashes.get(key);
      if (!hash) {
        hash = new Map();
        memoryHashes.set(key, hash);
      }
      hash.set(field, value);
    },
    async clear() {
      memory.clear();
      memoryHashes.clear();
    },
  };
}

function upstashConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Upstash pipeline-friendly single command via REST.
 * @see https://upstash.com/docs/redis/features/restapi
 */
async function upstashCommand(command: Array<string | number>): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Upstash Redis is not configured");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Upstash Redis error: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { result?: unknown; error?: string };
  if (payload.error) {
    throw new Error(`Upstash Redis error: ${payload.error}`);
  }
  return payload.result;
}

function upstashKv(): StatusKv {
  return {
    async get(key) {
      const result = await upstashCommand(["GET", key]);
      return typeof result === "string" ? result : result == null ? null : String(result);
    },
    async set(key, value) {
      await upstashCommand(["SET", key, value]);
    },
    async hgetall(key) {
      const result = await upstashCommand(["HGETALL", key]);
      // Upstash returns object or flat array depending on REST version
      if (result && typeof result === "object" && !Array.isArray(result)) {
        return Object.fromEntries(
          Object.entries(result as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
        );
      }
      if (!Array.isArray(result)) return {};
      const out: Record<string, string> = {};
      for (let i = 0; i < result.length; i += 2) {
        const field = result[i];
        const value = result[i + 1];
        if (field != null && value != null) out[String(field)] = String(value);
      }
      return out;
    },
    async hset(key, field, value) {
      await upstashCommand(["HSET", key, field, value]);
    },
  };
}

let overrideKv: StatusKv | null = null;

/** Test seam — inject a mock KV backend. */
export function setStatusKvForTests(kv: StatusKv | null): void {
  overrideKv = kv;
}

export function getStatusKv(): StatusKv {
  if (overrideKv) return overrideKv;
  if (upstashConfigured()) return upstashKv();
  return memoryKv();
}

export function isStatusHistoryDurable(): boolean {
  return overrideKv != null || upstashConfigured();
}
