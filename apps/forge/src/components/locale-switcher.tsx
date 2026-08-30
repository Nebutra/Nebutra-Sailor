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

// Cookie is canonical BCP-47 (`zh-Hans-CN`). getRequestConfig returns the
// route/message key (`zh-Hans`); the factory folds useLocale() back onto
// CANONICAL_LOCALES so the active pin still matches.
const Inner = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: CANONICAL_LOCALES,
    labels,
    mode: "cookie",
    displayLocale: (locale) => defaultCompactTrigger(locale),
  },
);

/** Cookie-mode full-wheel switcher for Forge shell (canonical BCP-47). */
export function LocaleSwitcher(props: { className?: string } = {}) {
  const t = useTranslations("nav");
  return (
    <Inner
      {...(props.className ? { className: props.className } : {})}
      ariaLabel={t.has("languageAria" as never) ? t("languageAria" as never) : "Change language"}
    />
  );
}
