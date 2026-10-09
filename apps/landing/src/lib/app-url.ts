import { env } from "@/lib/env";
import { belongsHere } from "@/site-map";

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

/**
 * A demo site has no product app behind it. When NEXT_PUBLIC_DEMO_CTA_URL is set,
 * Sign in / Get started lead there as-is (no /sign-in path, no returnUrl: the
 * target is a destination, not an app to log into). Unset on every real instance.
 */
export function createAppSignInUrl(
  returnUrl?: string,
  appUrl: string = env.NEXT_PUBLIC_APP_URL,
  demoCtaUrl: string | undefined = env.NEXT_PUBLIC_DEMO_CTA_URL,
): string {
  return demoCtaUrl || createAppUrl("/sign-in", { returnUrl }, appUrl);
}

export function createAppSignUpUrl(
  returnUrl?: string,
  appUrl: string = env.NEXT_PUBLIC_APP_URL,
  demoCtaUrl: string | undefined = env.NEXT_PUBLIC_DEMO_CTA_URL,
): string {
  return demoCtaUrl || createAppUrl("/sign-up", { returnUrl }, appUrl);
}

/**
 * Where "get started" leads. On the Nebutra site that is the Sailor licence flow;
 * the template does not ship /get-license, so there it is the app's sign-up.
 * site-map.ts decides which pages exist — this only asks it.
 */
export function getStartedHref(): string {
  return belongsHere({ href: "/get-license" }) ? "/get-license" : createAppSignUpUrl();
}
