"use client";

import { Droplet, Lightning, ShieldCheck, Sparkles, Star, Users } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { useTranslations } from "next-intl";

export function FocusSection() {
  const t = useTranslations("focus");

  return (
    <section className="mx-auto max-w-5xl px-6 py-32 relative text-center">
      <AnimateIn preset="fadeUp" inView>
        <h3 className="font-serif italic text-4xl text-gray-400 dark:text-gray-500 mb-8 tracking-tight">
          {t("label")}
        </h3>
      </AnimateIn>

      <AnimateIn preset="fadeUp" delay={0.1} inView>
        <p className="md:text-6xl lg:text-7xl leading-snug z-10 text-5xl font-normal text-gray-900 dark:text-white tracking-tight max-w-4xl w-full mx-auto">
          {t("headline")}{" "}
          <span className="text-gray-400 dark:text-gray-500 font-normal">
            {t("headline_muted")}
          </span>
        </p>
      </AnimateIn>

      {/* Structured Pills Below the Text */}
      <AnimateIn preset="fadeUp" delay={0.2} inView>
        <div className="mt-16 sm:mt-24 flex flex-wrap justify-center items-center gap-3 sm:gap-4 max-w-3xl mx-auto px-4 z-10 relative">
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900/60 rounded-full shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:border-[var(--color-accent-muted)] cursor-default">
            <Lightning className="w-4 h-4 text-[var(--color-accent-dark)]" /> {t("pills.ai_agents")}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900/60 rounded-full shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:border-[var(--color-accent-muted)] cursor-default">
            <Sparkles className="w-4 h-4 text-amber-500" /> {t("pills.ux_engineering")}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900/60 rounded-full shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:border-[var(--color-accent-muted)] cursor-default">
            <Droplet className="w-4 h-4 text-blue-500" /> {t("pills.fullstack_architecture")}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900/60 rounded-full shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:border-[var(--color-accent-muted)] cursor-default">
            <ShieldCheck className="w-4 h-4 text-indigo-500" /> {t("pills.systems_design")}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900/60 rounded-full shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:border-[var(--color-accent-muted)] cursor-default">
            <Users className="w-4 h-4 text-gray-500 dark:text-gray-400" /> {t("pills.open_source")}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900/60 rounded-full shadow-sm dark:shadow-none border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:border-[var(--color-accent-muted)] cursor-default">
            <Star className="w-4 h-4 text-emerald-500" /> {t("pills.product_strategy")}
          </div>
        </div>
      </AnimateIn>
    </section>
  );
}
