"use client";

import { PRODUCT_LANGUAGE_META, type ProductLanguage } from "@nebutra/i18n/languages";
import { createLocaleSwitcher } from "@nebutra/i18n/locale-switcher";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";

/** Compact trigger labels for the global language wheel (CLDR Hans/Hant split). */
function buildLabels(): Record<(typeof locales)[number], string> {
  const out = {} as Record<(typeof locales)[number], string>;
  for (const loc of locales) {
    if (loc in PRODUCT_LANGUAGE_META) {
      const meta = PRODUCT_LANGUAGE_META[loc as ProductLanguage];
      // Prefer short endonyms for the trigger; full names live in picker lists.
      if (loc === "zh-Hans") out[loc] = "简体";
      else if (loc === "zh-Hant") out[loc] = "繁體";
      else if (loc === "en") out[loc] = "EN";
      else out[loc] = meta.endonym.length <= 6 ? meta.endonym : loc.toUpperCase();
    } else {
      out[loc] = loc;
    }
  }
  return out;
}

const LOCALE_LABELS = buildLabels();

// min-h-11 is present in the canonical component's trigger — verified by ui-governance test.
export const LocaleSwitcher = createLocaleSwitcher(
  { useRouter, usePathname },
  { locales, labels: LOCALE_LABELS },
);
