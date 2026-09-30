import { env } from "@/lib/env";

/**
 * "app:/sign-in" → the product app's URL; a site path is returned as is.
 *
 * The starter's words used to live here too (a `say(copy, locale)` helper
 * over src/content/site.ts `{ en, zh }` pairs). They now live in
 * messages/*.json under the `site` namespace, read with
 * getTranslations / useTranslations — see src/content/site.ts.
 */
export function appHref(href: string): string | null {
  return href.startsWith("app:")
    ? `${env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}${href.slice(4)}`
    : null;
}
