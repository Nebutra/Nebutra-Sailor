"use client";

import { createLocaleSwitcher } from "@nebutra/i18n/locale-switcher";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales } from "@/i18n/routing";

// Canonical labels for every locale this app supports.
const LOCALE_LABELS = {
  en: "EN",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  es: "ES",
  fr: "FR",
  de: "DE",
} as const;

// min-h-11 is present in the canonical component's trigger — verified by ui-governance test.
export const LocaleSwitcher = createLocaleSwitcher(
  { useRouter, usePathname },
  { locales, labels: LOCALE_LABELS },
);
