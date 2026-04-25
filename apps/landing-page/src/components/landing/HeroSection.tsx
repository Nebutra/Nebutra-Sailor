"use client";

import { ArrowRight } from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

const HERO_BACKGROUND_VIDEOS = {
  light:
    "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085844_21a8f4b3-dea5-4ede-be16-d53f6973bb14.mp4",
  dark: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260306_074215_04640ca7-042c-45d6-bb56-58b1e8a42489.mp4",
} as const;

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);

    return () => {
      mediaQuery.removeEventListener("change", syncPreference);
    };
  }, []);

  return prefersReducedMotion;
}

interface HeroBackgroundAnimationProps {
  mounted: boolean;
  resolvedTheme?: string;
}

function HeroBackgroundAnimation({ mounted, resolvedTheme }: HeroBackgroundAnimationProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const themeKey = mounted && resolvedTheme === "dark" ? "dark" : "light";
  const videoSource = HERO_BACKGROUND_VIDEOS[themeKey];

  return (
    <div
      aria-hidden="true"
      className="hero-motion-background pointer-events-none absolute inset-x-0 top-0 z-0"
    >
      {mounted && !prefersReducedMotion ? (
        <video
          key={videoSource}
          aria-hidden="true"
          autoPlay
          className="hero-motion-video"
          disablePictureInPicture
          loop
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
        >
          <source src={videoSource} type="video/mp4" />
        </video>
      ) : null}
      <div className="hero-motion-pattern" />
      <div className="hero-motion-veil" />
    </div>
  );
}

/**
 * HeroSection - Conversion-first hero.
 */
export function HeroSection() {
  const t = useTranslations("hero");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative isolate w-full overflow-visible bg-background pb-8 pt-24 lg:pt-32">
      <HeroBackgroundAnimation mounted={mounted} resolvedTheme={resolvedTheme} />

      <div className="relative z-10 w-full px-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center text-center">
          <AnimateInGroup
            stagger="normal"
            className="flex flex-col items-center justify-center space-y-6 md:space-y-7 w-full"
          >
            <AnimateIn preset="fadeUp">
              <div className="mx-auto flex w-fit cursor-default items-center justify-center gap-2 rounded-full border border-black/5 bg-white/60 py-1 pr-4 pl-2 text-xs font-semibold text-foreground shadow-sm backdrop-blur-xl transition-all hover:bg-white/75 dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12">
                <span className="flex h-5 items-center justify-center rounded-full bg-black dark:bg-white px-2 text-[10px] text-white dark:text-black">
                  Next.js
                </span>
                <span className="flex h-5 items-center justify-center text-[10px] opacity-70">
                  {t("badge").split("·")[1]}
                </span>
              </div>
            </AnimateIn>

            <AnimateIn preset="emerge">
              <h1 className="mx-auto max-w-[900px] text-[clamp(2.75rem,8vw,5rem)] leading-none font-bold tracking-normal text-zinc-950 dark:text-zinc-50">
                {t("headline1")}{" "}
                <span className="text-zinc-950 dark:text-zinc-50">{t("headline2")}</span>
              </h1>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <p className="mx-auto max-w-[680px] px-4 text-[17px] leading-normal font-medium text-zinc-600 md:text-[19px] dark:text-zinc-300">
                {t.rich("subheadline", {
                  highlight: (chunks) => (
                    <span
                      style={{
                        background: "var(--brand-gradient)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                      className="font-semibold"
                    >
                      {chunks}
                    </span>
                  ),
                })}
              </p>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <div className="flex flex-col items-center gap-3 sm:flex-row mt-4">
                <Link
                  href="/get-license"
                  className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full border border-foreground/10 bg-foreground px-8 py-3.5 text-[15px] font-semibold text-background shadow-xl shadow-primary/10 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <div className="absolute inset-0 bg-[var(--brand-gradient)] opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-10" />
                  {t("ctaGetAccess")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="https://demo.nebutra.com"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-7 py-3 text-[15px] font-semibold text-zinc-700 shadow-sm backdrop-blur-xl transition-all hover:bg-white active:scale-95 dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  <ExternalLink aria-hidden="true" className="h-4 w-4 opacity-70" />
                  {t("ctaExploreDemo")}
                </a>
              </div>
            </AnimateIn>
          </AnimateInGroup>
        </div>
      </div>
    </section>
  );
}

HeroSection.displayName = "HeroSection";
