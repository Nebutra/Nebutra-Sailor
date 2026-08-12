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
      {/* Turned down from vivid/0.6. The wash carried diagonal streaks across the
          full width of the headline, and a background that competes with the one
          line the page exists to deliver is a background doing the wrong job. */}
      <AuroraBackground intensity={0.3} position="top" variant="subtle" />

      <div className="relative z-10 w-full min-w-0 px-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col items-center justify-center text-center">
          <AnimateInGroup
            stagger="normal"
            className="flex w-full min-w-0 flex-col items-center justify-center space-y-6 md:space-y-7"
          >
            {/* H1 paints at full opacity from first frame so the LCP API can
                attribute it. AnimateIn would inline `opacity:0` server-side
                and disqualify the element. */}
            <h1
              className="mx-auto w-full max-w-[900px] text-balance font-semibold text-3xl text-foreground sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl"
              style={{
                letterSpacing: "var(--tracking-display)",
                lineHeight: "var(--leading-display)",
              }}
            >
              {t("headline1")} <span className="text-foreground">{t("headline2")}</span>
            </h1>

            <AnimateIn preset="fadeUp" className="w-full min-w-0">
              <p className="mx-auto w-full max-w-[680px] px-1 font-medium text-[16px] text-muted-foreground leading-normal sm:px-4 sm:text-[17px] md:text-[19px]">
                {t.rich("subheadline", {
                  highlight: (chunks) => (
                    <span className="font-semibold text-foreground">{chunks}</span>
                  ),
                })}
              </p>
            </AnimateIn>

            <AnimateIn preset="fadeUp" className="w-full min-w-0">
              <div className="mt-4 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:max-w-none sm:flex-row sm:items-center">
                <Button asChild variant="ink" size="lg" className="w-full sm:w-auto">
                  <Link
                    href="/get-license"
                    className="inline-flex items-center justify-center gap-2"
                  >
                    {t("ctaGetAccess")}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="#demo" className="inline-flex items-center justify-center gap-2">
                    <Play aria-hidden="true" className="h-4 w-4 opacity-70" />
                    {t("ctaExploreDemo")}
                  </Link>
                </Button>
              </div>
            </AnimateIn>

            {/* Below the buttons, not above the headline. The slot before an h1
                is where a page says what it is; a terminal command there answers
                "how do I install this" to somebody who does not yet know what it
                is, and repeats the install box the page closes with. Beside the
                CTAs it is the third option for the reader who has already
                decided. */}
            <AnimateIn className="w-full min-w-0 max-w-full pt-2" preset="fadeUp">
              <HeroInstallPill command="npx create-sailor@latest" copiedLabel={t("pillCopied")} />
            </AnimateIn>
          </AnimateInGroup>
        </div>
      </div>
    </section>
  );
}
