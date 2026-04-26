"use client";

import { Globe } from "@nebutra/icons";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { type Locale, locales } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  zh: "中文",
  ja: "日本語",
  ko: "한국어",
  es: "ES",
  fr: "FR",
  de: "DE",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (newLocale: Locale) => {
    router.push(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-[var(--radius-lg)] px-2.5 py-1.5 text-sm text-[var(--neutral-9)] transition-colors hover:text-[var(--neutral-12)] dark:text-white/60 dark:hover:text-white"
        aria-label={`Switch language, current language ${LOCALE_LABELS[locale] ?? locale.toUpperCase()}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Globe className="h-4 w-4" />
        <span className="font-medium">{LOCALE_LABELS[locale] ?? locale.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full z-50 mt-1 min-w-[110px] rounded-[var(--radius-xl)] border border-[var(--neutral-6)] bg-[var(--neutral-1)] py-1 shadow-lg dark:border-white/10"
        >
          {locales.map((l) => (
            <button
              type="button"
              key={l}
              role="option"
              aria-selected={l === locale}
              onClick={() => handleSelect(l)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors",
                l === locale
                  ? "font-medium text-[var(--blue-10)]"
                  : "text-[var(--neutral-10)] hover:bg-[var(--neutral-2)] hover:text-[var(--neutral-12)] dark:text-white/60 dark:hover:bg-white/5 dark:hover:text-white",
              )}
            >
              {LOCALE_LABELS[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
