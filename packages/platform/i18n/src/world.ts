/**
 * Global language / country / region helpers using platform Intl APIs.
 *
 * Avoids extra registry packages so `@nebutra/i18n` stays lockfile-light.
 * For full ISO tables, product apps can layer i18n-iso-countries / cldr-core.
 */

import { isValidLocaleTag, maximizeLocaleTag, toCanonicalLocaleTag } from "./bcp47";
import { displayName, languageEndonym, regionDisplayName } from "./display";

export interface WorldCountry {
  /** ISO 3166-1 alpha-2 */
  readonly alpha2: string;
  readonly name: string;
}

export interface WorldLanguage {
  /** ISO 639-1 / BCP 47 language subtag */
  readonly code: string;
  readonly name: string;
  readonly endonym: string;
}

export interface UnM49Region {
  /** UN M49 numeric code as string, e.g. "150" Europe */
  readonly code: string;
  readonly name: string;
  /** Child region codes or ISO alpha-2 territories (best-effort) */
  readonly children: readonly string[];
}

/** Common ISO 3166-1 alpha-2 codes used in product + compliance surfaces. */
const COMMON_COUNTRY_ALPHA2 = [
  "US",
  "CN",
  "JP",
  "KR",
  "GB",
  "DE",
  "FR",
  "ES",
  "IT",
  "PT",
  "BR",
  "MX",
  "CA",
  "AU",
  "IN",
  "ID",
  "TH",
  "VN",
  "SG",
  "MY",
  "PH",
  "TW",
  "HK",
  "MO",
  "NL",
  "BE",
  "SE",
  "NO",
  "DK",
  "FI",
  "PL",
  "CZ",
  "AT",
  "CH",
  "IE",
  "NZ",
  "AE",
  "SA",
  "TR",
  "RU",
  "UA",
  "IL",
  "ZA",
  "NG",
  "EG",
  "AR",
  "CL",
  "CO",
] as const;

/** Seed language codes for world listing (product + major locales). */
const COMMON_LANGUAGE_CODES = [
  "en",
  "zh",
  "ja",
  "ko",
  "es",
  "fr",
  "de",
  "pt",
  "it",
  "ru",
  "ar",
  "hi",
  "th",
  "vi",
  "id",
  "ms",
  "tr",
  "nl",
  "pl",
  "uk",
  "sv",
  "da",
  "fi",
  "no",
  "he",
  "cs",
  "ro",
  "hu",
  "el",
  "bn",
  "ta",
  "te",
  "mr",
  "gu",
  "kn",
  "ml",
  "pa",
  "ur",
  "fa",
  "sw",
] as const;

/** All supported product-facing countries with localized names. */
export function listWorldCountries(inLocale = "en"): readonly WorldCountry[] {
  return COMMON_COUNTRY_ALPHA2.map((alpha2) => ({
    alpha2,
    name: getCountryName(alpha2, inLocale),
  })).sort((a, b) => a.name.localeCompare(b.name, inLocale));
}

export function getCountryName(alpha2: string, inLocale = "en"): string {
  const code = alpha2.toUpperCase();
  return regionDisplayName(code, inLocale) || code;
}

/**
 * Languages from a curated seed list + DisplayNames (endonym + English labels).
 */
export function listWorldLanguages(inLocale = "en"): readonly WorldLanguage[] {
  return COMMON_LANGUAGE_CODES.map((code) => ({
    code,
    name: displayName(code, "language", inLocale),
    endonym: languageEndonym(code),
  })).sort((a, b) => a.name.localeCompare(b.name, inLocale));
}

/**
 * High-level UN M49 geographic regions (names via DisplayNames when available).
 */
export function listUnM49Regions(inLocale = "en"): readonly UnM49Region[] {
  // UN M49 continent codes under World (001)
  const top = ["002", "019", "142", "150", "009"] as const;
  return top.map((code) => ({
    code,
    name: regionDisplayName(code, inLocale) || code,
    children: [],
  }));
}

/** Territories contained under a UN M49 region — not expanded without CLDR. */
export function listTerritoriesInRegion(_regionCode: string): readonly string[] {
  return [];
}

/** Likely maximized default locale for a language or country (CLDR via Intl). */
export function likelyLocaleFor(languageOrRegion: string): string | undefined {
  if (/^[A-Z]{2}$/.test(languageOrRegion)) {
    return (
      toCanonicalLocaleTag(`und-${languageOrRegion}`) ??
      maximizeLocaleTag(`und-${languageOrRegion}`)
    );
  }
  if (!isValidLocaleTag(languageOrRegion) && !/^[a-z]{2,3}$/i.test(languageOrRegion)) {
    return undefined;
  }
  return toCanonicalLocaleTag(languageOrRegion) ?? maximizeLocaleTag(languageOrRegion);
}
