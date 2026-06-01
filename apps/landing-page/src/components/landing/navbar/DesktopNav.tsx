"use client";

import { ChevronDown } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/constants/landing-data";
import { SolutionsMegaMenu } from "./SolutionsMegaMenu";

export function DesktopNav() {
  const t = useTranslations("nav");
  type NavTranslationKey = Parameters<typeof t>[0];
  type LocalizedHref = Parameters<typeof Link>[0]["href"];

  return (
    <div className="hidden lg:flex items-center gap-3 xl:gap-5">
      {NAV_LINKS.map((link) => {
        if ("mega" in link) {
          return <SolutionsMegaMenu key={link.labelKey} />;
        }

        if ("children" in link) {
          return (
            <div key={link.labelKey} className="group/nav relative inline-block py-4">
              <button
                type="button"
                className="whitespace-nowrap flex items-center gap-1.5 text-[0.8rem] xl:text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12"
              >
                {t(link.labelKey as NavTranslationKey)}
                <ChevronDown className="h-3 w-3 opacity-60 transition-transform duration-300 group-hover/nav:-rotate-180" />
              </button>
              <div className="absolute left-1/2 top-12 mt-1 w-52 -translate-x-1/2 opacity-0 invisible group-hover/nav:visible group-hover/nav:opacity-100 transition-all duration-300 origin-top bg-transparent">
                <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-white/95 p-2.5 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:bg-background/95 dark:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.5)]">
                  <div className="flex flex-col gap-1">
                    {link.children.map((child) => {
                      const isExternal = child.href.startsWith("http");
                      const content = (
                        <>
                          {child.icon ? (
                            <child.icon className="h-4 w-4 text-muted-foreground/60 group-hover/child:text-foreground transition-colors" />
                          ) : null}
                          {t(child.labelKey as NavTranslationKey)}
                        </>
                      );

                      if (isExternal) {
                        return (
                          <a
                            key={child.labelKey}
                            href={child.href}
                            target="_blank"
                            rel="noreferrer"
                            className="flex w-full items-center gap-2.5 rounded-[var(--radius-xl)] px-4 py-2.5 text-sm font-medium text-muted-foreground/90 hover:bg-muted/80 hover:text-foreground transition-all duration-200 group/child"
                          >
                            {content}
                          </a>
                        );
                      }

                      return (
                        <Link
                          key={child.labelKey}
                          href={child.href as LocalizedHref}
                          className="flex w-full items-center gap-2.5 rounded-[var(--radius-xl)] px-4 py-2.5 text-sm font-medium text-muted-foreground/90 hover:bg-muted/80 hover:text-foreground transition-all duration-200 group/child"
                        >
                          {content}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
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
