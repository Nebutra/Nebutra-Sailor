"use client";

import { Cross, Menu } from "@nebutra/icons";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Link } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/constants/landing-data";
import { getGroupResources, RESOURCE_GROUPS } from "@/lib/constants/resources-data";
import { getGroupSolutions, pick, SOLUTION_GROUPS } from "@/lib/constants/solutions-data";
import { env } from "@/lib/env";
import { isZhUiLocale } from "@/lib/i18n/localized";
import { Presence } from "../Presence";

const APP_URL = env.NEXT_PUBLIC_APP_URL;

export function MobileDrawer() {
  const t = useTranslations("nav");
  const locale = useLocale();
  type NavTranslationKey = Parameters<typeof t>[0];
  type LocalizedHref = Parameters<typeof Link>[0]["href"];
  const [open, setOpen] = useState(false);
  const themeLabel = isZhUiLocale(locale) ? "外观" : "Theme";

  return (
    <div className="lg:hidden flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative z-[60] flex size-11 items-center justify-center rounded-[var(--radius-lg)] text-neutral-11 transition-colors hover:text-neutral-12"
        aria-label="Toggle menu"
      >
        {open ? <Cross className="size-6" /> : <Menu className="size-6" />}
      </button>

      <Presence
        className="fixed inset-x-0 top-[64px] z-50 h-[calc(100vh-64px)] overflow-y-auto border-border border-t bg-background/95 backdrop-blur-xl"
        show={open}
      >
        <div style={{ boxShadow: "var(--ring-hairline)" }}>
          <div className="flex h-full flex-col gap-4 p-6 pb-24">
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-neutral-6/60 px-4 py-3 dark:border-border/60 sm:hidden">
                <span className="text-sm font-medium text-neutral-12">{themeLabel}</span>
                <ThemeSwitcher />
              </div>

              {NAV_LINKS.map((link) => {
                if ("mega" in link) {
                  const groups =
                    link.labelKey === "resources"
                      ? RESOURCE_GROUPS.map((group) => ({
                          id: group.id,
                          label: group.label,
                          items: getGroupResources(group).map((resource) => ({
                            key: resource.href,
                            href: resource.href,
                            external: resource.external ?? false,
                            icon: resource.icon,
                            label: resource.label,
                          })),
                        }))
                      : SOLUTION_GROUPS.map((group) => ({
                          id: group.id,
                          label: group.label,
                          items: getGroupSolutions(group).map((s) => ({
                            key: s.slug,
                            href: `/solutions/${s.slug}`,
                            external: false,
                            icon: s.icon,
                            label: s.label,
                          })),
                        }));

                  return (
                    <div key={link.labelKey} className="flex flex-col gap-3 py-1">
                      <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                        {t(link.labelKey as NavTranslationKey)}
                      </span>
                      <div className="flex flex-col gap-4 pl-4 border-l-2 border-border/40">
                        {groups.map((group) => (
                          <div key={group.id} className="flex flex-col gap-2.5">
                            <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/50">
                              {pick(group.label, locale)}
                            </span>
                            {group.items.map((item) => {
                              const Icon = item.icon;
                              const content = (
                                <>
                                  <Icon className="size-4 opacity-70" />
                                  {pick(item.label, locale)}
                                </>
                              );
                              const className =
                                "flex items-center gap-2 text-[15px] font-medium text-neutral-11 transition-colors hover:text-neutral-12";
                              return item.external ? (
                                <a
                                  key={item.key}
                                  href={item.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => setOpen(false)}
                                  className={className}
                                >
                                  {content}
                                </a>
                              ) : (
                                <Link
                                  key={item.key}
                                  href={item.href as LocalizedHref}
                                  onClick={() => setOpen(false)}
                                  className={className}
                                >
                                  {content}
                                </Link>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                const isExternal = link.href.startsWith("http");
                const Icon = "icon" in link ? link.icon : null;
                const content = (
                  <>
                    {Icon && <Icon className="size-5" />}
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
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 text-[15px] font-medium text-neutral-11 transition-colors hover:text-neutral-12"
                    >
                      {content}
                    </a>
                  );
                }

                return (
                  <Link
                    key={link.labelKey}
                    href={link.href as LocalizedHref}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-[15px] font-medium text-neutral-11 transition-colors hover:text-neutral-12"
                  >
                    {content}
                  </Link>
                );
              })}
            </div>

            <div className="mt-auto flex flex-col gap-3 border-t border-neutral-6/60 pt-4 dark:border-border/60">
              <a
                href={`${APP_URL}/sign-in`}
                onClick={() => setOpen(false)}
                className="w-full rounded-[var(--radius-lg)] border border-neutral-6/60 px-4 py-3 text-center text-sm font-medium text-neutral-12 dark:border-border/60"
              >
                {t("signIn")}
              </a>
              <a
                href={`${APP_URL}/sign-up`}
                onClick={() => setOpen(false)}
                className="w-full rounded-[var(--radius-lg)] bg-[color:hsl(var(--foreground))] px-4 py-3 text-center text-sm font-medium text-[color:hsl(var(--background))]"
              >
                {t("getStarted")}
              </a>
            </div>
          </div>
        </div>
      </Presence>
    </div>
  );
}
