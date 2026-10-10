/**
 * The product language wheel, as the repo's scripts see it.
 *
 * There is exactly one list of languages: PRODUCT_LANGUAGES in
 * packages/platform/i18n/src/languages.ts. Scripts used to carry their own
 * copies — the translator, the seeder and the catalog registry each had one —
 * and they drifted: `scripts/i18n-catalogs.mjs` lost cs, ro and hu, so those
 * three languages were never translated at all (Forge cs: 1516 of 1731 strings
 * still English on 2026-10-10) while the routes served them.
 *
 * Node strips the TypeScript types on import, so this reads the package source
 * directly instead of a generated mirror that could fall behind.
 */
import {
  PRODUCT_LANGUAGE_META,
  PRODUCT_LANGUAGES,
} from "../../packages/platform/i18n/src/languages.ts";

export { PRODUCT_LANGUAGE_META, PRODUCT_LANGUAGES };

/** The language every catalog is written in. */
export const SOURCE_LOCALE = "en";

/** Every language a catalog is translated into. */
export const TARGET_LOCALES = PRODUCT_LANGUAGES.filter((id) => id !== SOURCE_LOCALE);

const englishNames = new Intl.DisplayNames(["en"], { type: "language" });

/** "Simplified Chinese (简体中文)" — the name a translator prompt needs. */
export function describeLocale(locale) {
  const meta = PRODUCT_LANGUAGE_META[locale];
  const english = englishNames.of(locale) ?? locale;
  return meta && meta.endonym !== english ? `${english} (${meta.endonym})` : english;
}

export function isProductLocale(locale) {
  return PRODUCT_LANGUAGES.includes(locale);
}
