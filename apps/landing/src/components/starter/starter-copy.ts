import { env } from "@/lib/env";

/**
 * "app:/sign-in" → the product app's URL; a site path is returned as is.
 *
 * The starter's words used to live here too (a `say(copy, locale)` helper
 * over src/content/site.ts `{ en, zh }` pairs). They now live in
 * messages/*.json under the `site` namespace, read with
 * getTranslations / useTranslations — see src/content/site.ts.
 */
export function appHref(
  href: string,
  demoCtaUrl: string | undefined = env.NEXT_PUBLIC_DEMO_CTA_URL,
): string | null {
  if (!href.startsWith("app:")) return null;
  // A demo site has no product app behind it: every product-app link goes to
  // the one configured destination, the same rule app-url.ts applies.
  if (demoCtaUrl) return demoCtaUrl;
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}${href.slice(4)}`;
}
