"use client";

import { PRODUCT_LANGUAGES } from "@nebutra/i18n/languages";
import {
  buildMessageKeyLocaleLabels,
  createLocaleSwitcher,
  defaultCompactTrigger,
} from "@nebutra/i18n/locale-switcher";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

const labels = buildMessageKeyLocaleLabels();

const Inner = createLocaleSwitcher(
  { useRouter, usePathname },
  {
    locales: PRODUCT_LANGUAGES,
    labels,
    mode: "cookie",
    displayLocale: (loc) => defaultCompactTrigger(loc),
  },
);

/** Cookie-mode full-wheel switcher for Forge shell. */
export function LocaleSwitcher(props: { className?: string } = {}) {
  const t = useTranslations("nav");
  return (
    <Inner
      {...(props.className ? { className: props.className } : {})}
      ariaLabel={t.has("languageAria" as never) ? t("languageAria" as never) : "Change language"}
    />
  );
}
