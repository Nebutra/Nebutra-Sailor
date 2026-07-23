import { ArrowRight, Play } from "@nebutra/icons";
import { AuroraBackground, Button } from "@nebutra/ui/primitives";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AnimateIn, AnimateInGroup } from "./AnimateIn";
import { HeroBackgroundVideo } from "./HeroBackgroundVideo";
import { HeroInstallPill } from "./HeroInstallPill";

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

  return (
    <section className="relative isolate w-full overflow-visible bg-transparent pb-8 pt-24 lg:pt-32">
      <HeroBackgroundVideo />
      <AuroraBackground variant="vivid" position="top" intensity={0.6} />

      <div className="relative z-10 w-full px-4">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-center text-center">
          <AnimateInGroup
            stagger="normal"
            className="flex flex-col items-center justify-center space-y-6 md:space-y-7 w-full"
          >
            <AnimateIn preset="fadeUp">
              <HeroInstallPill command="npx create-sailor@latest" copiedLabel={t("pillCopied")} />
            </AnimateIn>

            {/* H1 paints at full opacity from first frame so the LCP API can
                attribute it. AnimateIn would inline `opacity:0` server-side
                and disqualify the element. */}
            <h1
              className="mx-auto max-w-[900px] text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-balance text-zinc-950 dark:text-zinc-50"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              {t("headline1")}{" "}
              <span className="text-zinc-950 dark:text-zinc-50">{t("headline2")}</span>
            </h1>

            <AnimateIn preset="fadeUp">
              <p className="mx-auto max-w-[680px] px-4 text-[17px] leading-normal font-medium text-zinc-600 md:text-[19px] dark:text-zinc-300">
                {t.rich("subheadline", {
                  highlight: (chunks) => (
                    <span
                      style={{
                        background: "hsl(var(--primary))",
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
                <Button asChild variant="ink" size="lg">
                  <Link href="/get-license" className="inline-flex items-center gap-2">
                    {t("ctaGetAccess")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="#demo" className="inline-flex items-center gap-2">
                    <Play aria-hidden="true" className="h-4 w-4 opacity-70" />
                    {t("ctaExploreDemo")}
                  </Link>
                </Button>
              </div>
            </AnimateIn>
          </AnimateInGroup>
        </div>
      </div>
    </section>
  );
}
