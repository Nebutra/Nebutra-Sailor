import { toMessageLocale } from "./locales";

/**
 * Copy for the boot-log archive shown on the auth-center sign-in panel.
 *
 * It is a catalog of its own rather than a namespace inside `locales/`, for two
 * reasons. It is editorial prose on an editorial cadence, not UI strings, and it
 * is large — 217 records in four fields each. `locales/<locale>.json` is
 * imported whole on every request by every consumer of this package, so putting
 * the archive there would ship it into the dashboard's payload as well, where
 * nothing reads it.
 *
 * Loaded server-side only. The auth panel resolves the records it needs and
 * passes those strings to the client as props, so this file never crosses.
 *
 * Registered in scripts/i18n-catalogs.mjs as the `boot-log` catalog, which is
 * what makes `pnpm i18n:translate` and `pnpm i18n:check` pick it up with no
 * second list to remember.
 */
export interface BootLogCopy {
  readonly tag: string;
  readonly title: string;
  readonly body: string;
  readonly coda: string;
}

export interface BootLogCatalog {
  readonly panelLabel: string;
  readonly entries: Readonly<Record<string, BootLogCopy>>;
}

/**
 * Read the archive's copy for a locale, falling back to the English source.
 *
 * The relative template import is the same shape request.ts uses — a bundler
 * can enumerate the directory, which it cannot do through a package export.
 */
export async function loadBootLogCatalog(
  locale: null | string | undefined,
): Promise<BootLogCatalog> {
  const messageLocale = toMessageLocale(locale);
  try {
    return (await import(`../boot-log/${messageLocale}.json`)).default as BootLogCatalog;
  } catch {
    return (await import("../boot-log/en.json")).default as BootLogCatalog;
  }
}
