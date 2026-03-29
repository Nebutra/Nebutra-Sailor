"use client";

import { ArrowRight } from "@nebutra/icons";
import { useTheme } from "@nebutra/tokens";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as React from "react";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";

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
    <section className="relative w-full overflow-hidden bg-background pb-8 pt-24 lg:pt-32">
      {mounted && (
        <div className="spline-container absolute top-0 left-0 w-full h-full -z-10 pointer-events-none opacity-60 dark:opacity-50">
          <iframe
            src={
              resolvedTheme === "dark"
                ? "https://my.spline.design/retrofuturismbganimation-Lb3VtL1bNaYUnirKNzn0FvaW/"
                : "https://my.spline.design/orbit-XDLATgFZPQX6SO6dgJGqPwHD/"
            }
            frameBorder="0"
            width="100%"
            height="100%"
            id="aura-spline"
            title="Hero Background"
          />
        </div>
      )}

      <div className="relative z-10 w-full px-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center text-center">
          <AnimateInGroup
            stagger="normal"
            className="flex flex-col items-center justify-center space-y-6 md:space-y-7 w-full"
          >
            <AnimateIn preset="fadeUp">
              <div className="flex items-center justify-center gap-2 rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 pl-2 pr-4 py-1 text-xs font-semibold text-foreground shadow-sm w-fit mx-auto cursor-default transition-all hover:bg-black/10 dark:hover:bg-white/10">
                <span className="flex h-5 items-center justify-center rounded-full bg-black dark:bg-white px-2 text-[10px] text-white dark:text-black">
                  Next.js
                </span>
                <span className="flex h-5 items-center justify-center text-[10px] opacity-70">
                  {t("badge").split("·")[1]}
                </span>
              </div>
            </AnimateIn>

            <AnimateIn preset="emerge">
              <h1 className="mx-auto max-w-[900px] text-[clamp(2.75rem,8vw,5rem)] leading-none font-bold tracking-[-0.03em] text-zinc-900 dark:text-zinc-50">
                {t("headline1")}{" "}
                <span className="text-zinc-900 dark:text-zinc-50">{t("headline2")}</span>
              </h1>
            </AnimateIn>

            <AnimateIn preset="fadeUp">
              <p className="mx-auto max-w-[680px] text-[17px] md:text-[19px] text-zinc-500 dark:text-zinc-400 leading-normal font-medium px-4">
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
                  href="/pricing"
                  className="group relative inline-flex items-center justify-center gap-2 rounded-full overflow-hidden px-8 py-3.5 text-[15px] font-semibold shadow-xl shadow-primary/10 transition-all hover:scale-[1.02] active:scale-95 bg-foreground text-background border border-foreground/10"
                >
                  <div className="absolute inset-0 bg-[var(--brand-gradient)] opacity-0 transition-opacity duration-300 pointer-events-none group-hover:opacity-10" />
                  {t("ctaGetAccess")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="https://demo.nebutra.com"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-7 py-3 text-[15px] font-semibold text-zinc-700 dark:text-zinc-300 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 shadow-sm"
                >
                  <svg
                    className="w-4 h-4 opacity-70"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
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
