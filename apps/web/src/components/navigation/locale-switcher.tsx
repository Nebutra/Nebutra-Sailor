"use client";

import { usePathname, useRouter } from "@nebutra/i18n/routing";
import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

const LOCALES = ["en", "zh"] as const;
type LocaleCode = (typeof LOCALES)[number];

const NEXT_LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setLocaleCookie(locale: LocaleCode): void {
  if (typeof document === "undefined") return;
  document.cookie = `NEXT_LOCALE=${locale}; Path=/; Max-Age=${NEXT_LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale() as LocaleCode;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onDocumentClick(event: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  const handleLocaleChange = useCallback(
    (next: LocaleCode) => {
      setLocaleCookie(next);
      setOpen(false);
      startTransition(() => {
        router.replace(pathname, { locale: next });
      });
    },
    [pathname, router],
  );

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-label={t("ariaLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isPending}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-1 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <Globe className="h-4 w-4" aria-hidden />
        <span className="uppercase">{locale}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("ariaLabel")}
          className="absolute right-0 z-50 mt-1 w-36 rounded-md border border-neutral-7 bg-neutral-1 p-1 shadow-lg dark:border-white/10 dark:bg-neutral-12"
        >
          {LOCALES.map((cur) => {
            const isActive = locale === cur;
            return (
              <button
                key={cur}
                type="button"
                role="menuitem"
                aria-current={isActive ? "true" : undefined}
                onClick={() => handleLocaleChange(cur)}
                className="flex w-full items-center justify-between rounded-sm px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2 dark:text-white dark:hover:bg-white/10"
              >
                <span>{t(cur)}</span>
                {isActive && <Check className="h-3.5 w-3.5" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
