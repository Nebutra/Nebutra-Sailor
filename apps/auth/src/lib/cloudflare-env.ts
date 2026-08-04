/**
 * Apply Cloudflare Worker bindings to process.env for Better Auth / Prisma.
 *
 * Hyperdrive is preferred (pooled PlanetScale). Falls back to DATABASE_URL
 * secret when the binding is absent (local `next dev`, misconfigured worker).
 *
 * Call once per request at the start of the auth API route (idempotent).
 */
export function applyCloudflareDatabaseEnv(
  env?: Partial<CloudflareEnv> | null,
): "hyperdrive" | "secret" | "unchanged" {
  const hyperdrive = env?.HYPERDRIVE?.connectionString?.trim();
  if (hyperdrive) {
    if (process.env.DATABASE_URL !== hyperdrive) {
      process.env.DATABASE_URL = hyperdrive;
    }
    return "hyperdrive";
  }

  const fromBinding = env?.DATABASE_URL?.trim();
  if (fromBinding && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = fromBinding;
    return "secret";
  }

  return process.env.DATABASE_URL ? "unchanged" : "unchanged";
}

/** Copy critical auth secrets from Worker env when process.env is empty. */
export function applyCloudflareAuthSecrets(env?: Partial<CloudflareEnv> | null): void {
  if (!env) return;
  const pairs: Array<[keyof CloudflareEnv, string]> = [
    ["BETTER_AUTH_SECRET", "BETTER_AUTH_SECRET"],
    ["BETTER_AUTH_URL", "BETTER_AUTH_URL"],
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID"],
    ["GOOGLE_CLIENT_SECRET", "GOOGLE_CLIENT_SECRET"],
    ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_ID"],
    ["GITHUB_CLIENT_SECRET", "GITHUB_CLIENT_SECRET"],
    ["AUTH_COOKIE_DOMAIN", "AUTH_COOKIE_DOMAIN"],
    ["NEXT_PUBLIC_AUTH_URL", "NEXT_PUBLIC_AUTH_URL"],
    ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_APP_URL"],
  ];
  for (const [envKey, processKey] of pairs) {
    const value = env[envKey];
    if (typeof value === "string" && value.trim() && !process.env[processKey]) {
      process.env[processKey] = value.trim();
    }
  }
}
