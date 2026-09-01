/** OAuth providers configured for the auth-center (mirrors apps/web). */

export const OAUTH_PROVIDERS = ["google", "github", "apple", "microsoft", "feishu"] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

const OAUTH_PROVIDER_SET = new Set<string>(OAUTH_PROVIDERS);

export function isOAuthProvider(value: string | null | undefined): value is OAuthProvider {
  return typeof value === "string" && OAUTH_PROVIDER_SET.has(value);
}

export function detectEnabledOAuthProviders(
  env: Record<string, string | undefined> = process.env,
): readonly OAuthProvider[] {
  const enabled = new Set<OAuthProvider>();
  for (const provider of env.AUTH_ENABLED_OAUTH_PROVIDERS?.split(",") ?? []) {
    const candidate = provider.trim();
    if (isOAuthProvider(candidate)) enabled.add(candidate);
  }
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) enabled.add("google");
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) enabled.add("github");
  if (env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET) enabled.add("apple");
  if (env.MICROSOFT_CLIENT_ID && env.MICROSOFT_CLIENT_SECRET) enabled.add("microsoft");
  if (env.FEISHU_APP_ID && env.FEISHU_APP_SECRET) enabled.add("feishu");
  return OAUTH_PROVIDERS.filter((provider) => enabled.has(provider));
}

export function buildOAuthStartPath(provider: OAuthProvider, callbackURL: string): string {
  const params = new URLSearchParams({ callbackURL });
  return `/api/auth/oauth/${provider}?${params.toString()}`;
}

export const OAUTH_PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
  apple: "Apple",
  microsoft: "Microsoft",
  feishu: "Feishu",
};
