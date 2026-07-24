import { getLanguageDisplayName, getLanguageEndonym, getRegionDisplayName } from "./display-names";
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

function inferLanguageFromAccept(accept?: null | string): string | undefined {
  if (!accept) return undefined;
  try {
    const locale = new Intl.Locale(accept.split(",")[0]?.trim().split(";")[0] ?? "");
    if (locale.language === "zh") return "zh";
    return locale.language;
  } catch {
    return accept.split("-")[0]?.toLowerCase();
  }
}

export function parseMarketLocaleTag(tag: null | string | undefined): MarketLocale | undefined {
  if (!tag) return undefined;
  try {
    const locale = new Intl.Locale(tag.trim().replace(/_/g, "-"));
    const country = locale.region?.toUpperCase();
    if (!country) return undefined;
    const langRaw = locale.language;
    const language: ProductLanguage | undefined = isProductLanguage(langRaw)
      ? langRaw
      : langRaw === "zh"
        ? "zh"
        : undefined;
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
  const languageEndonym = getLanguageEndonym(marketLocale.language);
  const languageName = getLanguageDisplayName(marketLocale.language, displayLocale);
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
