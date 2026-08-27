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

// Cookie mode: same ID space as request.ts (canonicalizeLocaleOrDefault).
// Do NOT pass PRODUCT_LANGUAGES message keys — useLocale() returns BCP-47 tags.
const Inner = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: CANONICAL_LOCALES,
    labels,
    mode: "cookie",
    displayLocale: (locale) => defaultCompactTrigger(locale),
  },
);

/** Cookie-mode full-wheel switcher for Router chrome (canonical BCP-47). */
export function LocaleSwitcher(props: { className?: string } = {}) {
  const t = useTranslations("chrome");
  return (
    <Inner
      {...(props.className ? { className: props.className } : {})}
      ariaLabel={t.has("locale" as never) ? t("locale") : "Change language"}
    />
  );
}
