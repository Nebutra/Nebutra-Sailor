"use client";

import { Cross, Menu } from "@nebutra/icons";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { NAV_LINKS } from "@/lib/constants/landing-data";
import { env } from "@/lib/env";

const APP_URL = env.NEXT_PUBLIC_APP_URL;

export function MobileDrawer() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden flex items-center">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white z-[60] relative"
        aria-label="Toggle menu"
      >
        {open ? <Cross className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 top-[64px] border-t border-neutral-7 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-black/95 z-50 shadow-2xl h-[calc(100vh-64px)] overflow-y-auto"
          >
            <div className="flex flex-col gap-4 px-6 py-6 pb-24 h-full">
              <div className="flex-1 flex flex-col gap-4">
                {NAV_LINKS.map((link) => {
                  if ("children" in link) {
                    return (
                      <div key={link.labelKey} className="flex flex-col gap-3 py-1">
                        <span className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">
                          {t(link.labelKey as any)}
                        </span>
                        <div className="flex flex-col gap-4 pl-4 border-l-2 border-border/40">
                          {link.children.map((child) => {
                            const isExternal = child.href.startsWith("http");
                            const Component = isExternal ? "a" : Link;
                            return (
                              <Component
                                key={child.labelKey}
                                href={child.href as any}
                                onClick={() => setOpen(false)}
                                className="flex items-center gap-2 text-[15px] font-medium text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
                                {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                              >
                                {child.icon && (
                                  //@ts-expect-error - dynamic icon rendering
                                  <child.icon className="h-4 w-4 opacity-70" />
                                )}
                                {t(child.labelKey as any)}
                              </Component>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  const isExternal = link.href.startsWith("http");
                  const Component = isExternal ? "a" : Link;
                  const Icon = "icon" in link ? link.icon : null;

                  return (
                    <Component
                      key={link.labelKey}
                      href={link.href as any}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 text-[15px] font-medium text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
                      {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
                    >
                      {Icon && (
                        //@ts-expect-error
                        <Icon className="h-5 w-5" />
                      )}
                      {t(link.labelKey as any)}
                    </Component>
                  );
                })}
              </div>

              <div className="mt-auto flex flex-col gap-3 border-t border-neutral-7 pt-4 dark:border-white/10">
                <a
                  href={`${APP_URL}/sign-in`}
                  onClick={() => setOpen(false)}
                  className="w-full rounded-lg border border-neutral-7 px-4 py-3 text-center text-sm font-medium text-neutral-12 dark:border-white/15 dark:text-white"
                >
                  {t("signIn")}
                </a>
                <a
                  href={`${APP_URL}/sign-up`}
                  onClick={() => setOpen(false)}
                  className="w-full rounded-lg bg-[image:var(--brand-gradient)] px-4 py-3 text-center text-sm font-medium text-white"
                >
                  {t("getStarted")}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
