/**
 * Locale / language / region display names via ECMA-402 Intl.DisplayNames (CLDR data in engine).
 */

export type DisplayNamesType = "language" | "region" | "script" | "currency" | "calendar";

export function displayName(code: string, ofType: DisplayNamesType, inLocale = "en"): string {
  try {
    const dn = new Intl.DisplayNames([inLocale], { type: ofType });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Native endonym when possible (language name in that language). */
export function languageEndonym(languageOrTag: string): string {
  try {
    const lang = new Intl.Locale(languageOrTag).language;
    return displayName(lang, "language", languageOrTag);
  } catch {
    return languageOrTag;
  }
}

/** Locale label for UI switchers: endonym preferred. */
export function localeDisplayLabel(tag: string, uiLocale?: string): string {
  try {
    const dn = new Intl.DisplayNames([uiLocale ?? tag], {
      type: "language",
      languageDisplay: "standard",
    });
    // Prefer full tag, then language
    return dn.of(tag) ?? dn.of(new Intl.Locale(tag).language) ?? tag;
  } catch {
    return tag;
  }
}

export function regionDisplayName(regionCode: string, inLocale = "en"): string {
  return displayName(regionCode.toUpperCase(), "region", inLocale);
}
