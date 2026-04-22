export interface RedisConfig {
  url: string;
  token: string;
}

function firstDefined(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Resolve Redis credentials from either the current Upstash REST names or the
 * older generic aliases still present in some deployment templates.
 */
export function getRedisConfig(): RedisConfig {
  const url = firstDefined("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_URL");
  const token = firstDefined("UPSTASH_REDIS_REST_TOKEN", "UPSTASH_REDIS_TOKEN");

  if (!url || !token) {
    throw new Error("Redis credentials not configured");
  }

  return { url, token };
}
