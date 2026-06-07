"use client";

import { createLocaleSwitcher } from "@nebutra/i18n/locale-switcher";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type LocaleCode = "en" | "zh" | "de" | "es" | "fr" | "ja" | "ko";

// Canonical inner component — cookie mode, next/navigation hooks.
// router.refresh() re-runs getRequestConfig server-side after the NEXT_LOCALE
// cookie is written → instant in-place language switch with no URL change.
const _Inner = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: ["en", "zh", "de", "es", "fr", "ja", "ko"] as const,
    mode: "cookie",
    // Static fallbacks used when no labels prop is supplied (e.g. tests that
    // don't render the wrapper). The wrapper always passes translated labels.
    labels: {
      en: "English",
      zh: "中文",
      de: "Deutsch",
      es: "Español",
      fr: "Français",
      ja: "日本語",
      ko: "한국어",
    },
  },
);

/**
 * LocaleSwitcher for apps/web.
 *
 * Wraps the canonical component and provides translated labels + aria-label
 * from the shared "LocaleSwitcher" namespace so locale names match the app's
 * current language (e.g. "英文" / "中文" when in zh locale).
 */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const labels: Record<LocaleCode, string> = {
    en: t("en"),
    zh: t("zh"),
    de: t("de"),
    es: t("es"),
    fr: t("fr"),
    ja: t("ja"),
    ko: t("ko"),
  };
  return <_Inner ariaLabel={t("ariaLabel")} labels={labels} />;
}
