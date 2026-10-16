"use client";

import { useEffect } from "react";

/**
 * The root layout renders before a page knows its language (that depends on
 * the page's own locales), so the page corrects `<html lang>` here. The
 * content wrapper already carries the right `lang` for assistive tech.
 */
export function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return null;
}
