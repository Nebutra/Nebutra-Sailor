"use client";

import { Cross, Menu } from "@nebutra/icons";
import { AnimatePresence, domAnimation, LazyMotion, m } from "framer-motion";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/constants/landing-data";
import { env } from "@/lib/env";

const APP_URL = env.NEXT_PUBLIC_APP_URL;

export function MobileDrawer() {
  const t = useTranslations("nav");
  type NavTranslationKey = Parameters<typeof t>[0];
  type LocalizedHref = Parameters<typeof Link>[0]["href"];
  const [open, setOpen] = useState(false);

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

      <LazyMotion features={domAnimation}>
        <AnimatePresence>
          {open && (
            <m.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 top-[64px] z-50 h-[calc(100vh-64px)] overflow-y-auto border-t border-[var(--neutral-6)] bg-white/95 backdrop-blur-xl dark:border-border dark:bg-background/95"
              style={{ boxShadow: "var(--ring-hairline)" }}
            >
              <div className="flex h-full flex-col gap-4 p-6 pb-24">
                <div className="flex-1 flex flex-col gap-4">
                  {NAV_LINKS.map((link) => {
                    if ("children" in link) {
                      return (
                        <div key={link.labelKey} className="flex flex-col gap-3 py-1">
                          <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                            {t(link.labelKey as NavTranslationKey)}
                          </span>
                          <div className="flex flex-col gap-4 pl-4 border-l-2 border-border/40">
                            {link.children.map((child) => {
                              const isExternal = child.href.startsWith("http");
                              const content = (
                                <>
                                  {child.icon && <child.icon className="size-4 opacity-70" />}
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
                                    onClick={() => setOpen(false)}
                                    className="flex items-center gap-2 text-[15px] font-medium text-neutral-11 transition-colors hover:text-neutral-12"
                                  >
                                    {content}
                                  </a>
                                );
                              }

                              return (
                                <Link
                                  key={child.labelKey}
                                  href={child.href as LocalizedHref}
                                  onClick={() => setOpen(false)}
                                  className="flex items-center gap-2 text-[15px] font-medium text-neutral-11 transition-colors hover:text-neutral-12"
                                >
                                  {content}
                                </Link>
                              );
                            })}
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

                <div className="mt-auto flex flex-col gap-3 border-t border-neutral-7 pt-4 dark:border-border">
                  <a
                    href={`${APP_URL}/sign-in`}
                    onClick={() => setOpen(false)}
                    className="w-full rounded-[var(--radius-lg)] border border-neutral-7 px-4 py-3 text-center text-sm font-medium text-neutral-12 dark:border-border"
                  >
                    {t("signIn")}
                  </a>
                  <a
                    href={`${APP_URL}/sign-up`}
                    onClick={() => setOpen(false)}
                    className="w-full rounded-[var(--radius-lg)] bg-[color:var(--neutral-12)] px-4 py-3 text-center text-sm font-medium text-[color:var(--neutral-1)]"
                  >
                    {t("getStarted")}
                  </a>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </LazyMotion>
    </div>
  );
}
