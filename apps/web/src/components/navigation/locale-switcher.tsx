"use client";

import { createLocaleSwitcher } from "@nebutra/i18n/locale-switcher";
import { usePathname, useRouter } from "@nebutra/i18n/routing";
import { useTranslations } from "next-intl";

type LocaleCode = "en" | "zh";

// Canonical inner component — navigation hooks are bound once at module load.
const _Inner = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: ["en", "zh"] as const,
    // Static fallbacks used when no labels prop is supplied (e.g. tests that
    // don't render the wrapper). The wrapper always passes translated labels.
    labels: { en: "English", zh: "中文" },
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
  const labels: Record<LocaleCode, string> = { en: t("en"), zh: t("zh") };
  return <_Inner ariaLabel={t("ariaLabel")} labels={labels} />;
}
