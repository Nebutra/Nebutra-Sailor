import { ArrowRight } from "@nebutra/icons";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";
import { HeroBackgroundVideo } from "./HeroBackgroundVideo";

/**
 * HeroSection — Conversion-first hero.
 *
 * Server-rendered shell so the H1 (LCP candidate) lands in the initial HTML
 * payload. The only client surface is `HeroBackgroundVideo`, a small island
 * that owns theme-aware video swap. Entrance animation is removed from the H1
 * itself (would otherwise inline `opacity:0` and disqualify it as LCP);
 * supporting copy and CTAs still animate in around the title.
 */
export async function HeroSection() {
  const t = await getTranslations("hero");
  const badgeAfterDot = t("badge").split("·")[1];

  return (
    <section className="relative isolate w-full overflow-visible bg-transparent pb-8 pt-24 lg:pt-32">
      <HeroBackgroundVideo />

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
                  {badgeAfterDot}
                </span>
              </div>
            </AnimateIn>

            {/* H1 paints at full opacity from first frame so the LCP API can
                attribute it. AnimateIn would inline `opacity:0` server-side
                and disqualify the element. */}
            <h1 className="mx-auto max-w-[900px] text-[clamp(2.75rem,8vw,5rem)] leading-none font-bold tracking-normal text-zinc-950 dark:text-zinc-50">
              {t("headline1")}{" "}
              <span className="text-zinc-950 dark:text-zinc-50">{t("headline2")}</span>
            </h1>

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
