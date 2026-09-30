"use client";

import { Cross, Menu } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ThemeSwitcher } from "@/components/ui/theme-switcher";
import { Link } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/constants/landing-data";
import { env } from "@/lib/env";
import { usePublicMe } from "@/lib/use-public-me";
import { hereOnly } from "@/site-map";
import { Presence } from "../Presence";
import type { MenuId } from "./menu-types";
import { MENUS } from "./menus";

const APP_URL = env.NEXT_PUBLIC_APP_URL;

/** Reads a dynamic dotted path out of a namespace — the group/item ids are data, not literal keys. */
type DynamicTranslator = (key: string) => string;

export function MobileDrawer() {
  const t = useTranslations("nav");
  const tResourcesCatalog = useTranslations("resourcesCatalog") as unknown as DynamicTranslator;
  const tSolutionsNav = useTranslations("solutionsNav") as unknown as DynamicTranslator;
  const me = usePublicMe();
  type NavTranslationKey = Parameters<typeof t>[0];
  type LocalizedHref = Parameters<typeof Link>[0]["href"];
  const [open, setOpen] = useState(false);
  const themeLabel = t("theme");

  return (
    <div className="lg:hidden flex items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative z-[var(--layer-drawer)] flex size-11 items-center justify-center rounded-[var(--radius-lg)] text-neutral-11 transition-colors hover:text-neutral-12"
        aria-label="Toggle menu"
      >
        {open ? <Cross className="size-6" /> : <Menu className="size-6" />}
      </button>

      <Presence
        className="fixed inset-x-0 top-[64px] z-50 h-[calc(100dvh-64px)] overflow-y-auto border-border border-t bg-background/95 backdrop-blur-xl"
        show={open}
      >
        <div style={{ boxShadow: "var(--ring-hairline)" }}>
          <div className="flex h-full flex-col gap-4 p-6 pb-24">
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-neutral-6/60 px-4 py-3 dark:border-border/60 sm:hidden">
                <span className="text-sm font-medium text-neutral-12">{themeLabel}</span>
                <ThemeSwitcher />
              </div>

              {hereOnly(NAV_LINKS).map((link) => {
                if ("mega" in link) {
                  const groups = MENUS[link.labelKey as MenuId]?.groups() ?? [];
                  if (groups.length === 0) return null;
                  const tMenu = link.labelKey === "solutions" ? tSolutionsNav : tResourcesCatalog;

                  return (
                    <div key={link.labelKey} className="flex flex-col gap-3 py-1">
                      <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                        {t(link.labelKey as NavTranslationKey)}
                      </span>
                      <div className="flex flex-col gap-4 pl-4 border-l-2 border-border/40">
                        {groups.map((group) => (
                          <div key={group.id} className="flex flex-col gap-2.5">
                            <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground/50">
                              {tMenu(`groups.${group.id}`)}
                            </span>
                            {group.items.map((item) => {
                              const Icon = item.icon;
                              const content = (
                                <>
                                  <Icon className="size-4 opacity-70" />
                                  {tMenu(`items.${item.key}.label`)}
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

            {me ? null : (
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
            )}
          </div>
        </div>
      </Presence>
    </div>
  );
}
