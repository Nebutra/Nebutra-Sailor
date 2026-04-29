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
    <section className="relative w-full overflow-hidden bg-white py-28 md:py-36 dark:bg-black">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[image:var(--brand-gradient-radial)] opacity-20 blur-[110px]" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <AnimateIn preset="emerge" inView>
          <h2 className="text-3xl font-bold text-neutral-12 md:text-5xl lg:text-6xl dark:text-white">
            {t("heading")}
          </h2>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView className="mt-6">
          <p className="text-lg text-neutral-11 md:text-xl dark:text-white/70">{t("subheading")}</p>
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
            className="group inline-flex items-center gap-2 rounded-full bg-[image:var(--brand-gradient)] px-8 py-3.5 font-medium text-white shadow-brand-lg transition-transform hover:-translate-y-0.5"
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
