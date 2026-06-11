"use client";

import { createLocaleSwitcher } from "@nebutra/i18n/locale-switcher";
import { CANONICAL_LOCALES, type CanonicalLocale, toLocaleLabelKey } from "@nebutra/i18n/locales";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type LocaleCode = CanonicalLocale;

// Canonical inner component — cookie mode, next/navigation hooks.
// router.refresh() re-runs getRequestConfig server-side after the NEXT_LOCALE
// cookie is written → instant in-place language switch with no URL change.
const _Inner = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: CANONICAL_LOCALES,
    mode: "cookie",
    // Static fallbacks used when no labels prop is supplied (e.g. tests that
    // don't render the wrapper). The wrapper always passes translated labels.
    labels: {
      "en-US": "English",
      "zh-Hans-CN": "中文",
      "de-DE": "Deutsch",
      "es-ES": "Español",
      "fr-FR": "Français",
      "ja-JP": "日本語",
      "ko-KR": "한국어",
    },
    displayLocale: toLocaleLabelKey,
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
    "en-US": t("en"),
    "zh-Hans-CN": t("zh"),
    "de-DE": t("de"),
    "es-ES": t("es"),
    "fr-FR": t("fr"),
    "ja-JP": t("ja"),
    "ko-KR": t("ko"),
  };
  return <_Inner ariaLabel={t("ariaLabel")} labels={labels} />;
}
