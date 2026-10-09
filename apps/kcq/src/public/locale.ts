/**
 * Public-page locale choice (fork ADR 0003): an explicit choice persists and wins; without one,
 * the browser language decides. Detection only ever leaves the default (`x-default`) URL: a
 * `/zh/...` URL is itself a locale signal, and crawlers render with an English browser, so
 * redirecting away from it would hide that variant from search.
 */
import {
  DEFAULT_PUBLIC_LOCALE,
  matchPublicRoute,
  PUBLIC_LOCALE_IDS,
  type PublicLocale,
  publicPath,
} from "./routes";

export const LOCALE_STORAGE_KEY = "kcq:locale";

function isPublicLocale(value: unknown): value is PublicLocale {
  return typeof value === "string" && (PUBLIC_LOCALE_IDS as string[]).includes(value);
}

/** First supported language in preference order; any `zh` tag maps to the zh pages. */
export function detectLocale(languages: readonly string[]): PublicLocale {
  for (const tag of languages) {
    const primary = tag.toLowerCase().split("-")[0];
    if (isPublicLocale(primary)) return primary;
  }
  return DEFAULT_PUBLIC_LOCALE;
}

export function readStoredLocale(storage: Pick<Storage, "getItem"> | undefined): PublicLocale | null {
  try {
    const value = storage?.getItem(LOCALE_STORAGE_KEY);
    return isPublicLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeLocale(storage: Pick<Storage, "setItem"> | undefined, locale: PublicLocale) {
  try {
    storage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Blocked storage: the choice still applies to this navigation.
  }
}

export interface LocaleRedirectInput {
  pathname: string;
  languages: readonly string[];
  stored: PublicLocale | null;
}

/** The path to replace the current one with, or null to stay. */
export function resolveLocaleRedirect({
  pathname,
  languages,
  stored,
}: LocaleRedirectInput): string | null {
  const route = matchPublicRoute(pathname);
  if (!route) return null;
  let target: PublicLocale;
  if (stored) target = stored;
  else if (route.locale === DEFAULT_PUBLIC_LOCALE) target = detectLocale(languages);
  else return null;
  return target === route.locale ? null : publicPath(route.page, target);
}

/** `window.localStorage` itself throws when site data is blocked. */
export function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
