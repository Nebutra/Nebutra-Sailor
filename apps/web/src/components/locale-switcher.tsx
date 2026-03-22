"use client";

import { usePathname, useRouter } from "@nebutra/i18n/routing";
import { Check, Globe } from "lucide-react";
import { useLocale } from "next-intl";
import { useTransition } from "react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      // NOTE: Here we ensure the same pathname is preserved, just swapping locale.
      router.replace(pathname, { locale: newLocale });
    });
  };

  return (
    <div className="relative group inline-block">
      <button
        type="button"
        disabled={isPending}
        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span className="uppercase">{locale}</span>
      </button>

      {/* Simple dropdown just for demo; replaced with better UI primitive in prod */}
      <div className="absolute right-0 mt-1 w-32 origin-top-right rounded-md bg-white dark:bg-neutral-900 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden group-hover:block z-50">
        <div className="py-1" role="menu">
          {["en", "zh"].map((cur) => (
            <button
              key={cur}
              onClick={() => handleLocaleChange(cur)}
              className="flex w-full items-center justify-between px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              role="menuitem"
            >
              {cur === "en" ? "English" : "中文"}
              {locale === cur && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
