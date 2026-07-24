import {
  isProductLanguage,
  PRODUCT_LANGUAGE_META,
  type ProductLanguage,
  toShippedMessageKey,
} from "./languages";
export type MarketDefinition = {
  country: string;
  nameEn: string;
  languages: readonly ProductLanguage[];
  defaultLanguage: ProductLanguage;
};
export const MARKETS = [
  {
    country: "US",
    nameEn: "United States",
    languages: ["en", "es"] as const,
    defaultLanguage: "en" as const,
  },
  {
    country: "CA",
    nameEn: "Canada",
    languages: ["en", "fr"] as const,
    defaultLanguage: "en" as const,
  },
  {
    country: "MX",
    nameEn: "Mexico",
    languages: ["es", "en"] as const,
    defaultLanguage: "es" as const,
  },
  {
    country: "BR",
    nameEn: "Brazil",
    languages: ["pt", "en"] as const,
    defaultLanguage: "pt" as const,
  },
  {
    country: "GB",
    nameEn: "United Kingdom",
    languages: ["en"] as const,
    defaultLanguage: "en" as const,
  },
  { country: "IE", nameEn: "Ireland", languages: ["en"] as const, defaultLanguage: "en" as const },
  {
    country: "GI",
    nameEn: "Gibraltar",
    languages: ["en"] as const,
    defaultLanguage: "en" as const,
  },
  {
    country: "PT",
    nameEn: "Portugal",
    languages: ["pt", "en"] as const,
    defaultLanguage: "pt" as const,
  },
  {
    country: "ES",
    nameEn: "Spain",
    languages: ["es", "en"] as const,
    defaultLanguage: "es" as const,
  },
  {
    country: "FR",
    nameEn: "France",
    languages: ["fr", "en"] as const,
    defaultLanguage: "fr" as const,
  },
  {
    country: "BE",
    nameEn: "Belgium",
    languages: ["nl", "fr", "de", "en"] as const,
    defaultLanguage: "nl" as const,
  },
  {
    country: "NL",
    nameEn: "Netherlands",
    languages: ["nl", "en"] as const,
    defaultLanguage: "nl" as const,
  },
  {
    country: "LU",
    nameEn: "Luxembourg",
    languages: ["fr", "de", "en"] as const,
    defaultLanguage: "fr" as const,
  },
  {
    country: "DE",
    nameEn: "Germany",
    languages: ["de", "en"] as const,
    defaultLanguage: "de" as const,
  },
  {
    country: "AT",
    nameEn: "Austria",
    languages: ["de", "en"] as const,
    defaultLanguage: "de" as const,
  },
  {
    country: "CH",
    nameEn: "Switzerland",
    languages: ["de", "fr", "it", "en"] as const,
    defaultLanguage: "de" as const,
  },
  {
    country: "LI",
    nameEn: "Liechtenstein",
    languages: ["de", "en"] as const,
    defaultLanguage: "de" as const,
  },
  {
    country: "IT",
    nameEn: "Italy",
    languages: ["it", "en"] as const,
    defaultLanguage: "it" as const,
  },
  { country: "MT", nameEn: "Malta", languages: ["en"] as const, defaultLanguage: "en" as const },
  { country: "GR", nameEn: "Greece", languages: ["en"] as const, defaultLanguage: "en" as const },
  { country: "CY", nameEn: "Cyprus", languages: ["en"] as const, defaultLanguage: "en" as const },
  {
    country: "SE",
    nameEn: "Sweden",
    languages: ["sv", "en"] as const,
    defaultLanguage: "sv" as const,
  },
  { country: "NO", nameEn: "Norway", languages: ["en"] as const, defaultLanguage: "en" as const },
  { country: "DK", nameEn: "Denmark", languages: ["en"] as const, defaultLanguage: "en" as const },
  {
    country: "FI",
    nameEn: "Finland",
    languages: ["en", "sv"] as const,
    defaultLanguage: "en" as const,
  },
  { country: "EE", nameEn: "Estonia", languages: ["en"] as const, defaultLanguage: "en" as const },
  { country: "LV", nameEn: "Latvia", languages: ["en"] as const, defaultLanguage: "en" as const },
  {
    country: "LT",
    nameEn: "Lithuania",
    languages: ["en"] as const,
    defaultLanguage: "en" as const,
  },
  { country: "PL", nameEn: "Poland", languages: ["en"] as const, defaultLanguage: "en" as const },
  { country: "CZ", nameEn: "Czechia", languages: ["en"] as const, defaultLanguage: "en" as const },
  { country: "SK", nameEn: "Slovakia", languages: ["en"] as const, defaultLanguage: "en" as const },
  { country: "HU", nameEn: "Hungary", languages: ["en"] as const, defaultLanguage: "en" as const },
  { country: "RO", nameEn: "Romania", languages: ["en"] as const, defaultLanguage: "en" as const },
  { country: "BG", nameEn: "Bulgaria", languages: ["en"] as const, defaultLanguage: "en" as const },
  {
    country: "HR",
    nameEn: "Croatia",
    languages: ["en", "it"] as const,
    defaultLanguage: "en" as const,
  },
  {
    country: "SI",
    nameEn: "Slovenia",
    languages: ["en", "it"] as const,
    defaultLanguage: "en" as const,
  },
  {
    country: "AE",
    nameEn: "United Arab Emirates",
    languages: ["en"] as const,
    defaultLanguage: "en" as const,
  },
  {
    country: "ZA",
    nameEn: "South Africa",
    languages: ["en"] as const,
    defaultLanguage: "en" as const,
  },
  { country: "IN", nameEn: "India", languages: ["en"] as const, defaultLanguage: "en" as const },
  {
    country: "SG",
    nameEn: "Singapore",
    languages: ["en", "zh"] as const,
    defaultLanguage: "en" as const,
  },
  {
    country: "MY",
    nameEn: "Malaysia",
    languages: ["en", "zh"] as const,
    defaultLanguage: "en" as const,
  },
  { country: "TH", nameEn: "Thailand", languages: ["en"] as const, defaultLanguage: "en" as const },
  {
    country: "HK",
    nameEn: "Hong Kong",
    languages: ["en", "zh"] as const,
    defaultLanguage: "en" as const,
  },
  {
    country: "TW",
    nameEn: "Taiwan",
    languages: ["zh", "en"] as const,
    defaultLanguage: "zh" as const,
  },
  {
    country: "CN",
    nameEn: "China",
    languages: ["zh", "en"] as const,
    defaultLanguage: "zh" as const,
  },
  {
    country: "JP",
    nameEn: "Japan",
    languages: ["ja", "en"] as const,
    defaultLanguage: "ja" as const,
  },
  {
    country: "KR",
    nameEn: "South Korea",
    languages: ["ko", "en"] as const,
    defaultLanguage: "ko" as const,
  },
  {
    country: "AU",
    nameEn: "Australia",
    languages: ["en"] as const,
    defaultLanguage: "en" as const,
  },
  {
    country: "NZ",
    nameEn: "New Zealand",
    languages: ["en"] as const,
    defaultLanguage: "en" as const,
  },
] as const satisfies readonly MarketDefinition[];
const BY = new Map<string, MarketDefinition>(
  MARKETS.map((m) => [m.country, m as MarketDefinition]),
);
export function listMarkets(): readonly MarketDefinition[] {
  return MARKETS as unknown as readonly MarketDefinition[];
}
export function getMarket(country: null | string | undefined) {
  return country ? BY.get(country.toUpperCase()) : undefined;
}
export function isMarketCountry(c: null | string | undefined) {
  return getMarket(c) !== undefined;
}
export function getMarketLanguages(country: string) {
  return getMarket(country)?.languages ?? [];
}
export function isLanguageOfferedInMarket(country: string, language: ProductLanguage) {
  return getMarketLanguages(country).includes(language);
}
export function resolveMarketLanguage(country: string, preferred?: null | string): ProductLanguage {
  const m = getMarket(country);
  if (!m) return isProductLanguage(preferred) ? preferred : "en";
  if (preferred && isProductLanguage(preferred) && m.languages.includes(preferred))
    return preferred;
  return m.defaultLanguage;
}
export function assertMarketMatrixIntegrity(): void {
  const seen = new Set<string>();
  for (const m of listMarkets()) {
    if (seen.has(m.country)) throw new Error("dup " + m.country);
    seen.add(m.country);
    if (!/^[A-Z]{2}$/.test(m.country)) throw new Error("bad " + m.country);
    for (const l of m.languages)
      if (!isProductLanguage(l) || !PRODUCT_LANGUAGE_META[l]) throw new Error("lang " + l);
    if (!m.languages.includes(m.defaultLanguage)) throw new Error("default " + m.country);
  }
}
export function languagesUsedInMarkets(): ProductLanguage[] {
  const s = new Set<ProductLanguage>();
  for (const m of listMarkets()) for (const l of m.languages) s.add(l);
  return [...s];
}
export function shippedLanguagesUsedInMarkets() {
  return languagesUsedInMarkets().filter(
    (l) => toShippedMessageKey(l) === l && PRODUCT_LANGUAGE_META[l].catalog === "shipped",
  );
}
