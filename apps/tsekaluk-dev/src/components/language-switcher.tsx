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
 * Full PRODUCT_LANGUAGES wheel (path mode). Replaces the legacy 9-pill control.
 */
export const LanguageSwitcher = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: PRODUCT_LANGUAGES,
    labels,
    mode: "path",
    displayLocale: (loc) => defaultCompactTrigger(loc),
  },
);
