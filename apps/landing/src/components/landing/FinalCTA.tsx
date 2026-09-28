"use client";

import { ArrowRight } from "@nebutra/icons";
import { AuroraBackground, Button, Heading } from "@nebutra/ui/primitives";
import { useTranslations } from "next-intl";
import { createPublicDocsUrl } from "@/lib/docs-links";
import { heroContent } from "@/lib/landing-content";
import { AnimateIn } from "./AnimateIn";
import { CommandInstallBox } from "./CommandInstallBox";

/**
 * The closing product pitch, "stop fiddling, start building". It is page
 * content, so a page places it last in its own markup, on the page canvas;
 * the footer below draws the edge.
 *
 * Only conversion-intent pages carry it (home, features, pricing, solutions).
 * It used to be a `FooterMinimal` prop. When it was on by default it polluted
 * careers, legal and blog pages with a misplaced pitch.
 *
 * The button continues the command above it: install, then read how. It used
 * to say "Deploy Architecture" and open /get-license, under a line that says no
 * licence or card is needed.
 */
export function FinalCTA() {
  const t = useTranslations("microLanding.cta");
  const tCommand = useTranslations("cta");

  return (
    <section
      data-testid="footer-final-cta"
      className="relative w-full overflow-hidden bg-background text-foreground"
    >
      <AuroraBackground variant="vivid" position="bottom" intensity={0.5} />
      <AnimateIn
        preset="emerge"
        inView
        className="relative mx-auto max-w-wide px-6 py-24 text-center"
      >
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t("eyebrow")}
        </p>
        <Heading level={2} display align="center">
          {t("title")}
        </Heading>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          {t("description")}
        </p>
        <div className="mx-auto mt-8 max-w-xl">
          <CommandInstallBox
            command={heroContent.command}
            copyLabel={tCommand("copyLabel")}
            copiedLabel={tCommand("copiedLabel")}
          />
        </div>
        <div className="mt-6">
          <Button asChild variant="ink" size="lg">
            <a href={createPublicDocsUrl("getting-started/installation")}>
              {tCommand("startBuilding")}
              <ArrowRight className="ml-2 size-4" />
            </a>
          </Button>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">{t("license")}</p>
      </AnimateIn>
    </section>
  );
}
