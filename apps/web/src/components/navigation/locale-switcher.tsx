"use client";

import { usePathname, useRouter } from "@nebutra/i18n/routing";
import { Check, Globe } from "@nebutra/icons";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useAnchoredMenu } from "@/hooks/use-anchored-menu";

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
  const { triggerRef, menuRef, style } = useAnchoredMenu(open, () => setOpen(false));

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
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t("ariaLabel")}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isPending}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-medium text-neutral-11 transition-colors hover:bg-neutral-2 hover:text-neutral-12"
      >
        <Globe className="h-4 w-4" aria-hidden />
        <span className="uppercase">{locale}</span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={t("ariaLabel")}
            style={style}
            className="w-36 rounded-[var(--radius-md)] border border-neutral-7 bg-neutral-1 p-1 shadow-lg"
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
                  className="flex w-full items-center justify-between rounded-[var(--radius-sm)] px-3 py-1.5 text-sm text-neutral-12 transition-colors hover:bg-neutral-2"
                >
                  <span>{t(cur)}</span>
                  {isActive && <Check className="h-3.5 w-3.5" aria-hidden />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}
