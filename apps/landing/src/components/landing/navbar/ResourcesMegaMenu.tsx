"use client";

import { ArrowUpRight, ChevronDown } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getGroupResources, RESOURCE_GROUPS_HERE } from "@/lib/constants/resources-data";

/** Reads a dynamic dotted path out of a namespace — the group/item ids are data, not literal keys. */
type DynamicTranslator = (key: string) => string;

/**
 * Desktop Resources trigger + two-column mega-menu (DEVELOPERS / COMPANY).
 * Each item is an icon tile + title + description. Pure CSS hover/focus reveal,
 * matching SolutionsMegaMenu. Structure from `resources-data`; copy from the
 * small client-only `resourcesCatalog` message namespace.
 */
export function ResourcesMegaMenu() {
  const t = useTranslations("nav");
  const tCatalog = useTranslations("resourcesCatalog") as unknown as DynamicTranslator;
  type LocalizedHref = Parameters<typeof Link>[0]["href"];

  const itemClass =
    "group/child flex items-start gap-3 rounded-[var(--radius-xl)] px-2.5 py-2.5 transition-colors duration-200 hover:bg-muted/80";

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

      <div
        className={`fixed left-1/2 top-16 ${RESOURCE_GROUPS_HERE.length > 1 ? "w-[min(46rem,calc(100vw-2rem))]" : "w-[min(23rem,calc(100vw-2rem))]"} -translate-x-1/2 origin-top invisible opacity-0 transition-[opacity,visibility] duration-300 group-hover/nav:visible group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:opacity-100`}
      >
        <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-popover/95 p-5 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.5)]">
          <div
            className={`grid gap-x-8 ${RESOURCE_GROUPS_HERE.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {RESOURCE_GROUPS_HERE.map((group, index) => (
              <div
                key={group.id}
                className={`flex flex-col gap-2 ${index === 0 ? "pr-1" : "border-l border-border/50 pl-8"}`}
              >
                <span className="px-2.5 text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {tCatalog(`groups.${group.id}`)}
                </span>
                <div className="flex flex-col gap-0.5">
                  {getGroupResources(group).map((item) => {
                    const Icon = item.icon;
                    const inner = (
                      <>
                        <Icon className="mt-0.5 size-[18px] shrink-0 text-muted-foreground/60 transition-colors group-hover/child:text-foreground" />
                        <span className="flex flex-col">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-12">
                            {tCatalog(`items.${item.id}.label`)}
                            {item.external && (
                              <ArrowUpRight
                                className="size-3 text-muted-foreground/60"
                                aria-hidden
                              />
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground/80">
                            {tCatalog(`items.${item.id}.tagline`)}
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
