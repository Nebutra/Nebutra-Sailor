import React from "react";

("use client");

import { ChevronDown } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/constants/landing-data";

export function DesktopNav() {
  const t = useTranslations("nav");

  return (
    <div className="hidden lg:flex items-center gap-3 xl:gap-5">
      {NAV_LINKS.map((link) => {
        if ("children" in link) {
          return (
            <div key={link.labelKey} className="group/nav relative inline-block py-4">
              <button className="whitespace-nowrap flex items-center gap-1.5 text-[0.8rem] xl:text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white">
                {t(link.labelKey as any)}
                <ChevronDown className="h-3 w-3 opacity-60 transition-transform duration-300 group-hover/nav:-rotate-180" />
              </button>
              <div className="absolute left-1/2 top-12 mt-1 w-52 -translate-x-1/2 opacity-0 invisible group-hover/nav:visible group-hover/nav:opacity-100 transition-all duration-300 origin-top bg-transparent">
                <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white/95 dark:bg-black/95 backdrop-blur-xl p-2.5 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.5)]">
                  <div className="flex flex-col gap-1">
                    {link.children.map((child) => {
                      const isExternal = child.href.startsWith("http");
                      const Component = isExternal ? "a" : Link;
                      return (
                        <Component
                          key={child.labelKey}
                          href={child.href as any}
                          className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground/90 hover:bg-muted/80 hover:text-foreground transition-all duration-200 group/child"
                          {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                        >
                          {child.icon ? (
                            <child.icon className="h-4 w-4 text-muted-foreground/60 group-hover/child:text-foreground transition-colors" />
                          ) : null}
                          {t(child.labelKey as any)}
                        </Component>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        }

        const isExternal = link.href.startsWith("http");
        const Component = isExternal ? "a" : Link;
        return (
          <Component
            key={link.labelKey}
            href={link.href as any}
            className="whitespace-nowrap flex items-center gap-1.5 text-[0.8rem] xl:text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
            {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {(link as any).icon
              ? React.createElement((link as any).icon, { className: "h-4 w-4" })
              : null}
            {t(link.labelKey as any)}
          </Component>
        );
      })}
    </div>
  );
}
