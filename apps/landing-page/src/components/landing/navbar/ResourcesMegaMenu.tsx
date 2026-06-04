"use client";

import { ArrowUpRight, ChevronDown } from "@nebutra/icons";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getGroupResources, pick, RESOURCE_GROUPS } from "@/lib/constants/resources-data";

/**
 * Desktop Resources trigger + two-column mega-menu (DEVELOPERS / COMPANY).
 * Each item is an icon tile + title + description. Pure CSS hover/focus reveal,
 * matching SolutionsMegaMenu. Content is sourced from `resources-data`.
 */
export function ResourcesMegaMenu() {
  const t = useTranslations("nav");
  const locale = useLocale();
  type LocalizedHref = Parameters<typeof Link>[0]["href"];

  const itemClass =
    "group/child flex items-start gap-3 rounded-[var(--radius-xl)] px-2.5 py-2.5 transition-all duration-200 hover:bg-muted/80";

  return (
    <div className="group/nav relative inline-block py-4">
      <button
        type="button"
        aria-haspopup="true"
        className="flex items-center gap-1.5 whitespace-nowrap text-[0.8rem] font-medium text-neutral-11 transition-colors hover:text-neutral-12 xl:text-sm"
      >
        {t("resources")}
        <ChevronDown className="h-3 w-3 opacity-60 transition-transform duration-300 group-hover/nav:-rotate-180 group-focus-within/nav:-rotate-180" />
      </button>

      <div className="fixed left-1/2 top-16 w-[min(46rem,calc(100vw-2rem))] -translate-x-1/2 origin-top invisible opacity-0 transition-all duration-300 group-hover/nav:visible group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:opacity-100">
        <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-white/95 p-5 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:bg-background/95 dark:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-2 gap-x-8">
            {RESOURCE_GROUPS.map((group, index) => (
              <div
                key={group.id}
                className={`flex flex-col gap-2 ${index === 0 ? "pr-1" : "border-l border-border/50 pl-8"}`}
              >
                <span className="px-2.5 text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {pick(group.label, locale)}
                </span>
                <div className="flex flex-col gap-0.5">
                  {getGroupResources(group).map((item) => {
                    const Icon = item.icon;
                    const inner = (
                      <>
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-border/60 bg-muted/40 text-muted-foreground/70 transition-colors group-hover/child:border-border group-hover/child:text-foreground">
                          <Icon className="size-4" />
                        </span>
                        <span className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-12">
                            {pick(item.label, locale)}
                            {item.external && (
                              <ArrowUpRight
                                className="size-3 text-muted-foreground/60"
                                aria-hidden
                              />
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground/80">
                            {pick(item.tagline, locale)}
                          </span>
                        </span>
                      </>
                    );

                    return item.external ? (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className={itemClass}
                      >
                        {inner}
                      </a>
                    ) : (
                      <Link key={item.href} href={item.href as LocalizedHref} className={itemClass}>
                        {inner}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
