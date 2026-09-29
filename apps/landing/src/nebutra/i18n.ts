/**
 * The Nebutra site speaks English and Simplified Chinese. Copy lives beside
 * the page that shows it, as { en, zh } pairs; this picks one. A locale the
 * site has not been written in reads English — never a half-translated key.
 */
export type SiteLang = "en" | "zh";

export interface Bi<T = string> {
  en: T;
  zh: T;
}

/** Every zh-* route locale reads Chinese; everything else reads English. */
export function siteLang(locale: string | undefined): SiteLang {
  return locale?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

export function pick<T>(lang: SiteLang, copy: Bi<T>): T {
  return copy[lang];
}

/** The route locale each site language is served under. */
export const SITE_LOCALE: Record<SiteLang, string> = { en: "en", zh: "zh-Hans" };
