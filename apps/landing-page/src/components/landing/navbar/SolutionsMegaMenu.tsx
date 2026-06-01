"use client";

import { ChevronDown } from "@nebutra/icons";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getGroupSolutions, pick, SOLUTION_GROUPS } from "@/lib/constants/solutions-data";

/**
 * Desktop Solutions trigger + grouped mega-menu panel. Routes are flat
 * (`/solutions/[slug]`); the panel presents them in one column per group.
 * Pure CSS hover, matching the existing `resources` dropdown behavior.
 */
export function SolutionsMegaMenu() {
  const t = useTranslations("nav");
  const locale = useLocale();
  type LocalizedHref = Parameters<typeof Link>[0]["href"];

  return (
    <div className="group/nav relative inline-block py-4">
      <button
        type="button"
        aria-haspopup="true"
        className="whitespace-nowrap flex items-center gap-1.5 text-[0.8rem] xl:text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12"
      >
        {t("solutions")}
        <ChevronDown className="h-3 w-3 opacity-60 transition-transform duration-300 group-hover/nav:-rotate-180 group-focus-within/nav:-rotate-180" />
      </button>

      <div className="fixed left-1/2 top-16 w-[min(56rem,calc(100vw-2rem))] -translate-x-1/2 opacity-0 invisible group-hover/nav:visible group-hover/nav:opacity-100 group-focus-within/nav:visible group-focus-within/nav:opacity-100 transition-all duration-300 origin-top">
        <div className="rounded-[var(--radius-2xl)] border border-border/60 bg-white/95 p-5 shadow-[0_20px_40px_-5px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:bg-background/95 dark:shadow-[0_20px_40px_-5px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
            {SOLUTION_GROUPS.map((group) => (
              <div key={group.id} className="flex flex-col gap-2">
                <span className="px-2 text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {pick(group.label, locale)}
                </span>
                <div className="flex flex-col gap-0.5">
                  {getGroupSolutions(group).map((s) => {
                    const Icon = s.icon;
                    return (
                      <Link
                        key={s.slug}
                        href={`/solutions/${s.slug}` as LocalizedHref}
                        className="group/child flex items-start gap-2.5 rounded-[var(--radius-xl)] px-2 py-2 transition-all duration-200 hover:bg-muted/80"
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60 transition-colors group-hover/child:text-foreground" />
                        <span className="flex flex-col">
                          <span className="text-sm font-medium text-neutral-12">
                            {pick(s.label, locale)}
                          </span>
                          <span className="text-xs text-muted-foreground/80">
                            {pick(s.tagline, locale)}
                          </span>
                        </span>
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
