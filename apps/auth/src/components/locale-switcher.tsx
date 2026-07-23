"use client";

import { createLocaleSwitcher } from "@nebutra/i18n/locale-switcher";
import { CANONICAL_LOCALES, type CanonicalLocale, toLocaleLabelKey } from "@nebutra/i18n/locales";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type LocaleCode = CanonicalLocale;

const _Inner = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: CANONICAL_LOCALES,
    mode: "cookie",
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
 * Same cookie-mode LocaleSwitcher as apps/web (NEXT_LOCALE + router.refresh).
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
