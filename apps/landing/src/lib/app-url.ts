import { env } from "@/lib/env";

type QueryValue = string | null | undefined;

function normalizeAppOrigin(appUrl: string): string {
  return appUrl.replace(/\/+$/, "");
}

export function createAppUrl(
  path: `/${string}`,
  params: Record<string, QueryValue> = {},
  appUrl: string = env.NEXT_PUBLIC_APP_URL,
): string {
  const url = new URL(path, `${normalizeAppOrigin(appUrl)}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

export function createAppSignInUrl(
  returnUrl?: string,
  appUrl: string = env.NEXT_PUBLIC_APP_URL,
): string {
  return createAppUrl("/sign-in", { returnUrl }, appUrl);
}

export function createAppSignUpUrl(
  returnUrl?: string,
  appUrl: string = env.NEXT_PUBLIC_APP_URL,
): string {
  return createAppUrl("/sign-up", { returnUrl }, appUrl);
}
