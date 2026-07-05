export const OAUTH_PROVIDERS = ["google", "github", "apple", "microsoft"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

const OAUTH_PROVIDER_SET = new Set<string>(OAUTH_PROVIDERS);

export function isOAuthProvider(value: string | null | undefined): value is OAuthProvider {
  return typeof value === "string" && OAUTH_PROVIDER_SET.has(value);
}

export function detectEnabledOAuthProviders(
  env: Record<string, string | undefined> = process.env,
): readonly OAuthProvider[] {
  const enabled: OAuthProvider[] = [];
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) enabled.push("google");
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) enabled.push("github");
  if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) enabled.push("apple");
  if (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) enabled.push("microsoft");
  return enabled;
}

export function buildOAuthStartPath(provider: OAuthProvider, callbackURL: string): string {
  const params = new URLSearchParams({ callbackURL });
  return `/api/auth/oauth/${provider}?${params.toString()}`;
}
