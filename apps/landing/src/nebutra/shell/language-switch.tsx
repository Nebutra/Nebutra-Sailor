"use client";

import { cn } from "@nebutra/ui/utils";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { SITE_LOCALE, type SiteLang, siteLang } from "@/nebutra/i18n";

const OPTIONS: { lang: SiteLang; label: string }[] = [
  { lang: "en", label: "English" },
  { lang: "zh", label: "中文" },
];

/** English ⇄ 中文, same page. Each option is a real link, so it works without JS. */
export function LanguageSwitch() {
  const current = siteLang(useLocale());
  const pathname = usePathname() ?? "/";
  return (
    <nav aria-label="Language / 语言" className="inline-flex items-center gap-3">
      {OPTIONS.map((o) => (
        <Link
          key={o.lang}
          href={pathname}
          locale={SITE_LOCALE[o.lang]}
          hrefLang={SITE_LOCALE[o.lang]}
          aria-current={o.lang === current ? "true" : undefined}
          className={cn(
            "transition-colors duration-micro",
            o.lang === current ? "text-foreground" : "hover:text-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
