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
    <section className="relative w-full overflow-hidden border-t border-[var(--neutral-6)] bg-[var(--neutral-1)] py-28 md:py-36 dark:border-[var(--neutral-4)] dark:bg-[var(--neutral-1)]">
      <div
        className="landing-cta-rule pointer-events-none absolute inset-x-0 top-0 h-px"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <AnimateIn preset="emerge" inView>
          <h2 className="text-3xl font-bold text-neutral-12 md:text-5xl lg:text-6xl">
            {t("heading")}
          </h2>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView className="mt-6">
          <p className="text-lg text-neutral-11 md:text-xl">{t("subheading")}</p>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView className="mx-auto mt-10 max-w-xl">
          <CommandInstallBox
            command={heroContent.command}
            copyLabel={t("copyLabel")}
            copiedLabel={t("copiedLabel")}
          />
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView className="mt-8">
          <a
            href={createPublicDocsUrl("getting-started/installation")}
            className="landing-brand-action group inline-flex items-center gap-2 rounded-full px-8 py-3.5 font-medium text-white transition-transform hover:-translate-y-0.5"
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
