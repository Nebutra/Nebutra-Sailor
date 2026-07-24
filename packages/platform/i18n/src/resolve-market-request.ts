import { getCurrencyForCountry } from "./currency";
import { isProductLanguage, type ProductLanguage } from "./languages";
import { createMarketLocale, type MarketLocale, resolveMarketLocale } from "./market-locale";
import { isMarketCountry } from "./markets";

export type MarketRequestHints = {
  marketCookie?: null | string;
  geoCountry?: null | string;
  pathLanguage?: null | string;
  acceptLanguage?: null | string;
};

const DEFAULT_COUNTRY_FOR_LANGUAGE: Partial<Record<ProductLanguage, string>> = {
  en: "US",
  zh: "CN",
  ja: "JP",
  ko: "KR",
  de: "DE",
  fr: "FR",
  es: "ES",
  pt: "BR",
  it: "IT",
  nl: "NL",
  sv: "SE",
};

export function resolveCountryFromRequest(hints: MarketRequestHints): string {
  const cookie = hints.marketCookie?.toUpperCase();
  if (cookie && isMarketCountry(cookie)) return cookie;

  const geo = hints.geoCountry?.toUpperCase();
  if (geo && isMarketCountry(geo)) return geo;

  const lang = hints.pathLanguage;
  if (lang && isProductLanguage(lang)) {
    const fallback = DEFAULT_COUNTRY_FOR_LANGUAGE[lang];
    if (fallback && isMarketCountry(fallback)) return fallback;
  }
  return "US";
}

export function resolveMarketLocaleFromRequest(hints: MarketRequestHints): MarketLocale {
  const country = resolveCountryFromRequest(hints);
  const language =
    hints.pathLanguage && isProductLanguage(hints.pathLanguage) ? hints.pathLanguage : undefined;
  return resolveMarketLocale({
    country,
    language,
    acceptLanguage: hints.acceptLanguage,
  });
}

export function resolveCurrencyFromRequest(hints: MarketRequestHints): string {
  return getCurrencyForCountry(resolveCountryFromRequest(hints));
}

export function marketLocaleForSelection(
  country: string,
  language: ProductLanguage,
): MarketLocale | undefined {
  return createMarketLocale(country, language);
}
