import { PRODUCT_LANGUAGE_META, type ProductLanguage } from "./languages";

const displayNameCache = new Map<string, Intl.DisplayNames>();

function getDisplayNames(
  locale: string,
  type: Intl.DisplayNamesOptions["type"],
): Intl.DisplayNames | undefined {
  const key = `${locale}::${type}`;
  const hit = displayNameCache.get(key);
  if (hit) return hit;
  try {
    const dn = new Intl.DisplayNames([locale], { type, fallback: "code" });
    displayNameCache.set(key, dn);
    return dn;
  } catch {
    return undefined;
  }
}

export function getRegionDisplayName(countryCode: string, displayLocale = "en"): string {
  const code = countryCode.toUpperCase();
  return getDisplayNames(displayLocale, "region")?.of(code) ?? code;
}

export function getLanguageDisplayName(
  language: ProductLanguage | string,
  displayLocale = "en",
): string {
  if (language in PRODUCT_LANGUAGE_META) {
    const meta = PRODUCT_LANGUAGE_META[language as ProductLanguage];
    const script = "script" in meta ? meta.script : undefined;
    const tag = script ? `${meta.language}-${script}` : meta.language;
    const dn = getDisplayNames(displayLocale, "language");
    const named = dn?.of(tag) ?? dn?.of(meta.language);
    if (named && named !== tag && named !== meta.language) return named;
    return meta.endonym;
  }
  return getDisplayNames(displayLocale, "language")?.of(language) ?? language;
}

export function getLanguageEndonym(language: ProductLanguage): string {
  return PRODUCT_LANGUAGE_META[language].endonym;
}
