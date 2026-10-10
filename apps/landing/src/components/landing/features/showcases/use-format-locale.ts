"use client";

import { toHtmlLang } from "@nebutra/i18n/locales";
import { useLocale } from "next-intl";

/**
 * The BCP-47 tag the showcases format numbers with — the route's real locale
 * (`de` → `de-DE`, `zh-Hans` → `zh-Hans-CN`), not an en/zh pair.
 */
export function useFormatLocale(): string {
  return toHtmlLang(useLocale());
}
