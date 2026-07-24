"use client";

import { createMarketLocalePicker } from "@nebutra/i18n/market-locale-picker";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

function usePickerCopy() {
  const t = useTranslations("MarketLocalePicker");
  return {
    title: t("title"),
    description: t("description"),
    triggerAria: t("triggerAria"),
    searchPlaceholder: t("searchPlaceholder"),
    plannedHint: t("plannedHint"),
    noResults: t("noResults"),
    menuAria: t("menuAria"),
  };
}

export const MarketLocalePicker = createMarketLocalePicker(
  { useRouter, usePathname },
  { copy: usePickerCopy },
);

MarketLocalePicker.displayName = "MarketLocalePicker";
