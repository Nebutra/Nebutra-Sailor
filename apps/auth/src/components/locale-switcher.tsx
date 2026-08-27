"use client";

import {
  buildCanonicalLocaleLabels,
  createLocaleSwitcher,
  defaultCompactTrigger,
} from "@nebutra/i18n/locale-switcher";
import { CANONICAL_LOCALES, type CanonicalLocale } from "@nebutra/i18n/locales";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type LocaleCode = CanonicalLocale;

const labels = buildCanonicalLocaleLabels(CANONICAL_LOCALES) as Record<LocaleCode, string>;

const _Inner = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: CANONICAL_LOCALES,
    mode: "cookie",
    labels,
    displayLocale: (locale) => defaultCompactTrigger(locale),
  },
);

/** Cookie-mode full-wheel switcher (same SSOT as apps/web). */
export function LocaleSwitcher(props: { className?: string } = {}) {
  const t = useTranslations("LocaleSwitcher");
  return (
    <_Inner
      {...(props.className ? { className: props.className } : {})}
      ariaLabel={t("ariaLabel")}
    />
  );
}
