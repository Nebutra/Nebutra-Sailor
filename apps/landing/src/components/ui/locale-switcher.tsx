"use client";

import { PRODUCT_LANGUAGES } from "@nebutra/i18n/languages";
import {
  buildMessageKeyLocaleLabels,
  createLocaleSwitcher,
  defaultCompactTrigger,
} from "@nebutra/i18n/locale-switcher";
import { usePathname, useRouter } from "@/i18n/navigation";

const labels = buildMessageKeyLocaleLabels();

/**
 * Path-mode full-wheel switcher (URL locales).
 * Landing navbar prefers MarketLocalePicker; this remains for secondary surfaces.
 */
export const LocaleSwitcher = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: PRODUCT_LANGUAGES,
    labels,
    mode: "path",
    displayLocale: (loc) => defaultCompactTrigger(loc),
  },
);
