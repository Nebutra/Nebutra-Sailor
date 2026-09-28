import { brand } from "@nebutra/brand/metadata";
import type { Copy } from "@/content/site";
import { env } from "@/lib/env";
import { isZhUiLocale } from "@/lib/i18n/localized";

/** The locale's version of a string from src/content/site.ts, with `{brand}` filled in. */
export function say(copy: Copy, locale: string): string {
  return (isZhUiLocale(locale) ? copy.zh : copy.en).replaceAll("{brand}", brand.name);
}

/** "app:/sign-in" → the product app's URL; a site path is returned as is. */
export function appHref(href: string): string | null {
  return href.startsWith("app:")
    ? `${env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "")}${href.slice(4)}`
    : null;
}
