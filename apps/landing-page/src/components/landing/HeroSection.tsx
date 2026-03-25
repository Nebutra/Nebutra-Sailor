"use client";

import { ArrowRight } from "@nebutra/icons";
import { useTranslations } from "next-intl";
import { heroContent } from "@/lib/landing-content";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";
import { CommandInstallBox } from "./CommandInstallBox";
import { HeroLottieVisual } from "./HeroLottieVisual";

/**
 * HeroSection - Conversion-first hero with product visual.
 */
export function HeroSection() {
  const t = useTranslations("hero");

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-white dark:bg-black">
      <div className="pointer-events-none absolute inset-0 bg-grid-overlay" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/3 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[image:var(--brand-gradient-radial)] opacity-[0.22] blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-6 pt-24 pb-16">
        <div className="grid w-full items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
          <AnimateInGroup stagger="normal" className="space-y-8">
            <AnimateIn preset="fadeUp">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-7 bg-blue-2 px-4 py-1.5 text-xs tracking-wide text-blue-11 dark:border-white/20 dark:bg-white/10 dark:text-white/80">
                {t("badge")}
              </span>
            </AnimateIn>

            <AnimateIn preset="emerge">
              <h1 className="max-w-4xl text-[clamp(2.25rem,8vw,5.25rem)] leading-[1.05] font-bold tracking-tight text-neutral-12 dark:text-white">
                {t("headline1")}
                <br />
                <span className="bg-[image:var(--brand-gradient)] bg-clip-text text-transparent">
                  {t("headline2")}
                </span>
              </h1>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <p className="max-w-2xl text-lg text-neutral-11 md:text-xl dark:text-white/70">
                {t("subheadline")}
              </p>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <div className="w-full max-w-xl">
                <CommandInstallBox
                  command={heroContent.command}
                  copyLabel={t("copyLabel")}
                  copiedLabel={t("copiedLabel")}
                />
              </div>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <a
                  href="https://docs.nebutra.com/sailor/getting-started"
                  className="group inline-flex items-center gap-2 rounded-full bg-[image:var(--brand-gradient)] px-8 py-3.5 font-medium text-white shadow-brand-lg transition-transform hover:-translate-y-0.5"
                >
                  {t("ctaGetStarted")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="https://github.com/Nebutra/Nebutra-Sailor"
                  className="inline-flex items-center gap-2 text-sm font-medium text-neutral-11 transition-colors hover:text-neutral-12 dark:text-white/70 dark:hover:text-white"
                >
                  {t("ctaViewGitHub")}
                </a>
              </div>
            </AnimateIn>
          </AnimateInGroup>

          <AnimateIn preset="scale" className="lg:justify-self-end">
            <HeroLottieVisual />
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}

HeroSection.displayName = "HeroSection";
