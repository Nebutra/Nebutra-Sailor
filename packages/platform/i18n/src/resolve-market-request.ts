import { getCurrencyForCountry } from "./currency";
import { isProductLanguage, PRODUCT_LANGUAGE_META, type ProductLanguage } from "./languages";
import { createMarketLocale, type MarketLocale, resolveMarketLocale } from "./market-locale";
import { isMarketCountry } from "./markets";

export type MarketRequestHints = {
  marketCookie?: null | string;
  geoCountry?: null | string;
  pathLanguage?: null | string;
  acceptLanguage?: null | string;
};

export function resolveCountryFromRequest(hints: MarketRequestHints): string {
  const cookie = hints.marketCookie?.toUpperCase();
  if (cookie && isMarketCountry(cookie)) return cookie;

  const geo = hints.geoCountry?.toUpperCase();
  if (geo && isMarketCountry(geo)) return geo;

  const lang = hints.pathLanguage;
  if (lang && isProductLanguage(lang)) {
    // The registry's default region for the language — not a second table.
    const fallback = PRODUCT_LANGUAGE_META[lang].defaultRegion;
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
