"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/constants/landing-data";
import { hereOnly } from "@/site-map";
import type { MenuId } from "./menu-types";
import { MENUS } from "./menus";

export function DesktopNav() {
  const t = useTranslations("nav");
  type NavTranslationKey = Parameters<typeof t>[0];
  type LocalizedHref = Parameters<typeof Link>[0]["href"];

  return (
    <div className="hidden lg:flex items-center gap-3 xl:gap-5">
      {hereOnly(NAV_LINKS).map((link) => {
        if ("mega" in link) {
          const Menu = MENUS[link.labelKey as MenuId]?.Desktop;
          return Menu ? <Menu key={link.labelKey} /> : null;
        }

        const isExternal = link.href.startsWith("http");
        const Icon = "icon" in link ? link.icon : null;
        const content = (
          <>
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {t(link.labelKey as NavTranslationKey)}
          </>
        );

        if (isExternal) {
          return (
            <a
              key={link.labelKey}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="whitespace-nowrap flex items-center gap-1.5 text-[0.8rem] xl:text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12"
            >
              {content}
            </a>
          );
        }

        return (
          <Link
            key={link.labelKey}
            href={link.href as LocalizedHref}
            className="whitespace-nowrap flex items-center gap-1.5 text-[0.8rem] xl:text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12"
          >
            {content}
          </Link>
        );
      })}
    </div>
  );
}
