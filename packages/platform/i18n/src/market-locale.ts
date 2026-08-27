import { getLanguageEndonym, getRegionDisplayName } from "./display-names";
import {
  isProductLanguage,
  PRODUCT_LANGUAGE_META,
  type ProductLanguage,
  toShippedMessageKey,
} from "./languages";
import {
  getMarket,
  isLanguageOfferedInMarket,
  listMarkets,
  type MarketDefinition,
  resolveMarketLanguage,
} from "./markets";

export { LOCALE_COOKIE, MARKET_COOKIE } from "./cookies";

export type MarketLocale = {
  country: string;
  language: ProductLanguage;
  bcp47: string;
  messageKey: ProductLanguage;
  pathTag: string;
};

export type MarketLocaleLabels = {
  countryName: string;
  languageName: string;
  languageEndonym: string;
  trigger: string;
};

function composeBcp47(language: ProductLanguage, country: string): string {
  const meta = PRODUCT_LANGUAGE_META[language];
  const region = country.toUpperCase();
  const script = "script" in meta ? meta.script : undefined;
  if (script) return `${meta.language}-${script}-${region}`;
  return `${meta.language}-${region}`;
}

function toPathTag(bcp47: string): string {
  return bcp47.toLowerCase().replace(/_/g, "-");
}

export function createMarketLocale(
  country: string,
  language: ProductLanguage,
): MarketLocale | undefined {
  const market = getMarket(country);
  if (!market) return undefined;
  if (!isLanguageOfferedInMarket(market.country, language)) return undefined;
  const bcp47 = composeBcp47(language, market.country);
  return {
    country: market.country,
    language,
    bcp47,
    messageKey: toShippedMessageKey(language),
    pathTag: toPathTag(bcp47),
  };
}

export function resolveMarketLocale(input: {
  country?: null | string;
  language?: null | string;
  acceptLanguage?: null | string;
}): MarketLocale {
  const country = (
    input.country ??
    inferCountryFromAccept(input.acceptLanguage) ??
    "US"
  ).toUpperCase();
  const market = getMarket(country) ?? getMarket("US")!;
  const language = resolveMarketLanguage(
    market.country,
    input.language ?? inferLanguageFromAccept(input.acceptLanguage),
  );
  return createMarketLocale(market.country, language)!;
}

function inferCountryFromAccept(accept?: null | string): string | undefined {
  if (!accept) return undefined;
  try {
    return new Intl.Locale(accept.split(",")[0]?.trim().split(";")[0] ?? "").region?.toUpperCase();
  } catch {
    return accept.match(/-([A-Za-z]{2})\b/)?.[1]?.toUpperCase();
  }
}

function chineseProductKeyFromLocale(locale: Intl.Locale): ProductLanguage {
  // CLDR: script Hant → Traditional; Hans / default → Simplified
  const max = locale.maximize();
  if (max.script === "Hant") return "zh-Hant";
  return "zh-Hans";
}

function inferLanguageFromAccept(accept?: null | string): string | undefined {
  if (!accept) return undefined;
  try {
    const locale = new Intl.Locale(accept.split(",")[0]?.trim().split(";")[0] ?? "");
    if (locale.language === "zh") return chineseProductKeyFromLocale(locale);
    return locale.language;
  } catch {
    return accept.split("-")[0]?.toLowerCase();
  }
}

export function parseMarketLocaleTag(tag: null | string | undefined): MarketLocale | undefined {
  if (!tag) return undefined;
  try {
    const normalized = tag.trim().replace(/_/g, "-");
    if (isProductLanguage(normalized)) {
      // Path tags like zh-Hans need a region — use default region from meta
      const { defaultRegion } = PRODUCT_LANGUAGE_META[normalized];
      return createMarketLocale(defaultRegion, normalized);
    }
    const locale = new Intl.Locale(normalized);
    const country = locale.region?.toUpperCase();
    if (!country) return undefined;
    const langRaw = locale.language;
    let language: ProductLanguage | undefined = isProductLanguage(langRaw) ? langRaw : undefined;
    if (!language && langRaw === "zh") language = chineseProductKeyFromLocale(locale);
    if (!language) return undefined;
    return createMarketLocale(country, language);
  } catch {
    return undefined;
  }
}

export function getMarketLocaleLabels(
  marketLocale: MarketLocale,
  displayLocale = "en",
): MarketLocaleLabels {
  const countryName = getRegionDisplayName(marketLocale.country, displayLocale);
  const meta = PRODUCT_LANGUAGE_META[marketLocale.language];
  // Prefer product endonyms (esp. zh-Hans / zh-Hant); ISO 639 for DisplayNames fallback
  const languageEndonym = meta.endonym;
  const languageName = meta.endonym;
  return {
    countryName,
    languageName,
    languageEndonym,
    trigger: `${marketLocale.pathTag} · ${languageEndonym} · ${countryName}`,
  };
}

export type MarketPickerEntry = {
  market: MarketDefinition;
  countryName: string;
  options: Array<{
    language: ProductLanguage;
    endonym: string;
    marketLocale: MarketLocale;
    planned: boolean;
  }>;
};

export function buildMarketPickerEntries(displayLocale = "en"): MarketPickerEntry[] {
  const entries: MarketPickerEntry[] = listMarkets().map((market) => ({
    market,
    countryName: getRegionDisplayName(market.country, displayLocale),
    options: market.languages.map((language) => ({
      language,
      endonym: getLanguageEndonym(language),
      marketLocale: createMarketLocale(market.country, language)!,
      planned: PRODUCT_LANGUAGE_META[language].catalog === "planned",
    })),
  }));
  return entries.sort((a, b) =>
    a.countryName.localeCompare(b.countryName, displayLocale, { sensitivity: "base" }),
  );
}

export function listAllMarketLocales(): MarketLocale[] {
  const out: MarketLocale[] = [];
  for (const market of listMarkets()) {
    for (const language of market.languages) {
      const ml = createMarketLocale(market.country, language);
      if (ml) out.push(ml);
    }
  }
  return out;
}

export type LanguagePickerEntry = {
  language: ProductLanguage;
  endonym: string;
  planned: boolean;
};

/**
 * The languages the marketing site ships, deduplicated across markets.
 *
 * The picker is language-first on purpose. What the site actually varies is
 * language; the market only decides currency, and currency does not need a
 * browsable list of political entities to be resolved. Listing regions as a
 * navigation axis bought no product value and put naming decisions about
 * contested territories into the UI.
 */
export function buildLanguagePickerEntries(): LanguagePickerEntry[] {
  const seen = new Map<ProductLanguage, LanguagePickerEntry>();
  for (const market of listMarkets()) {
    for (const language of market.languages) {
      if (seen.has(language)) continue;
      seen.set(language, {
        language,
        endonym: getLanguageEndonym(language),
        planned: PRODUCT_LANGUAGE_META[language].catalog === "planned",
      });
    }
  }
  return [...seen.values()].sort((a, b) =>
    a.endonym.localeCompare(b.endonym, "en", { sensitivity: "base" }),
  );
}

/**
 * Pair a chosen language with a market.
 *
 * Keeps the visitor's current market when it offers the language, so switching
 * language never silently changes their currency. Falls back to the first
 * market that does offer it, and finally to US/en.
 */
export function marketLocaleForLanguage(
  language: ProductLanguage,
  preferredCountry?: null | string,
): MarketLocale {
  if (preferredCountry) {
    const kept = createMarketLocale(preferredCountry, language);
    if (kept) return kept;
  }
  for (const market of listMarkets()) {
    const found = createMarketLocale(market.country, language);
    if (found) return found;
  }
  return createMarketLocale("US", "en") as MarketLocale;
}
