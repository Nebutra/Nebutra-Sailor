"use client";

import { ArrowRight } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { heroContent } from "@/lib/landing-content";
import { AnimateIn } from "./AnimateIn";
import { CommandInstallBox } from "./CommandInstallBox";

/**
 * FinalCTA - Closing conversion section.
 */
export function FinalCTA() {
  const t = useTranslations("cta");

  return (
    <section className="relative w-full overflow-hidden border-t border-border bg-background py-28 md:py-36 dark:border-[hsl(var(--muted))] dark:bg-background">
      <div
        className="landing-cta-rule pointer-events-none absolute inset-x-0 top-0 h-px"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto w-full min-w-0 max-w-4xl px-4 text-center sm:px-6">
        <AnimateIn preset="emerge" inView className="w-full min-w-0">
          <h2 className="w-full text-balance text-3xl font-bold text-neutral-12 md:text-5xl lg:text-6xl">
            {t("heading")}
          </h2>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView className="mt-6 w-full min-w-0">
          <p className="w-full text-balance text-base text-neutral-11 sm:text-lg md:text-xl">
            {t("subheading")}
          </p>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView className="mx-auto mt-10 w-full min-w-0 max-w-xl">
          <CommandInstallBox
            command={heroContent.command}
            copyLabel={t("copyLabel")}
            copiedLabel={t("copiedLabel")}
          />
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView className="mt-8 w-full min-w-0">
          <a
            href={createPublicDocsUrl("getting-started/installation")}
            className="landing-brand-action group inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-full px-8 py-3.5 font-medium text-white transition-transform hover:-translate-y-0.5 sm:w-auto sm:max-w-none"
          >
            {t("startBuilding")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
        </AnimateIn>
      </div>
    </section>
  );
}

FinalCTA.displayName = "FinalCTA";
