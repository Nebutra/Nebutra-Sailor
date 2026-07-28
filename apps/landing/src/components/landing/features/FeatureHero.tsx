import { ArrowRight, ArrowUpRight } from "@nebutra/icons";
import { AnimateIn } from "@nebutra/ui/components";
import { AuroraBackground, AuroraText, Badge } from "@nebutra/ui/primitives";
import Link from "next/link";
import type { ReactNode } from "react";
import type { FeatureGroupTokens } from "./feature-group-tokens";

export type FeatureHeroProps = {
  /** Back link href (renders only if provided). */
  backHref?: string;
  /** Back link label. */
  backLabel?: string;
  /** Group token bundle — supplies aurora colors + ambient + icon. */
  tokens: FeatureGroupTokens;
  /** Eyebrow label rendered inside an outline Badge with the group icon. */
  eyebrow: string;
  /** Secondary mono path Badge (e.g. "packages/iam/audit"). */
  path?: string;
  /** Title plain prefix (e.g. "audit"). */
  titlePrefix: string;
  /** Title gradient-suffix word — rendered through AuroraText (e.g. "package" / "能力包"). */
  titleSuffix: string;
  /** Hero summary paragraph. */
  summary: string;
  /** Primary CTA href (opens in new tab). Pass with primaryCtaLabel to render. */
  primaryCtaHref?: string;
  /** Primary CTA label. Pass with primaryCtaHref to render. */
  primaryCtaLabel?: string;
  /** Optional secondary block rendered below the CTA (used for the index hero's centered layout). */
  children?: ReactNode;
  /** Layout: "left" (detail page default) or "center" (index page). */
  align?: "left" | "center";
};

/**
 * Shared hero for feature surfaces. Renders an AuroraBackground ambient,
 * optional back link, eyebrow + path badges, AuroraText-accented title,
 * summary paragraph, and a primary CTA. Server-renderable.
 */
export function FeatureHero({
  backHref,
  backLabel,
  tokens,
  eyebrow,
  path,
  titlePrefix,
  titleSuffix,
  summary,
  primaryCtaHref,
  primaryCtaLabel,
  children,
  align = "left",
}: FeatureHeroProps) {
  const Icon = tokens.icon;
  const isCenter = align === "center";
  const stackAlign = isCenter ? "items-center text-center" : "items-start";
  const badgeRowAlign = isCenter ? "justify-center" : "";
  const paragraphAlign = isCenter ? "mx-auto" : "";

  return (
    <section
      className="relative isolate mx-auto flex max-w-[1400px] flex-col px-4 pt-36 pb-20 sm:px-6 lg:px-8"
      data-align={align}
    >
      <AuroraBackground
        variant={tokens.ambient}
        position="top"
        intensity={0.55}
        className="inset-y-0 left-1/2 right-auto w-screen -translate-x-1/2"
      />

      <div className={`relative flex flex-col gap-6 ${stackAlign}`}>
        {backHref && backLabel ? (
          <AnimateIn preset="fade" inView>
            <Link
              className="group/back inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.32em] transition-colors hover:text-foreground"
              href={backHref}
            >
              <ArrowRight aria-hidden="true" className="size-3 rotate-180" />
              {backLabel}
            </Link>
          </AnimateIn>
        ) : null}

        <AnimateIn preset="fade" inView delay={0.05}>
          <div className={`flex flex-wrap items-center gap-2 ${badgeRowAlign}`}>
            <Badge
              variant="outline"
              size="sm"
              className="gap-1.5 font-mono uppercase tracking-[0.18em]"
            >
              <Icon className="size-3" />
              {eyebrow}
            </Badge>
            {path ? (
              <Badge
                variant="secondary"
                size="sm"
                className="font-mono normal-case tracking-normal"
                translate="no"
              >
                {path}
              </Badge>
            ) : null}
          </div>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView delay={0.1}>
          <h1
            className="font-semibold text-4xl tracking-tight sm:text-5xl md:text-6xl lg:text-[5.5rem]"
            style={{ letterSpacing: "var(--tracking-display)", lineHeight: 1.05 }}
          >
            <span translate="no">{titlePrefix}</span>{" "}
            <AuroraText colors={tokens.auroraColors} speed={0.6}>
              {titleSuffix}
            </AuroraText>
          </h1>
        </AnimateIn>

        <AnimateIn preset="fadeUp" inView delay={0.18}>
          <p
            className={`max-w-2xl text-base text-muted-foreground leading-relaxed sm:text-lg ${paragraphAlign}`}
          >
            {summary}
          </p>
        </AnimateIn>

        {primaryCtaHref && primaryCtaLabel ? (
          <AnimateIn preset="fadeUp" inView delay={0.26}>
            <a
              href={primaryCtaHref}
              target="_blank"
              rel="noreferrer"
              className="group/cta inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 font-semibold text-background text-sm transition-opacity hover:opacity-90"
            >
              {primaryCtaLabel}
              <ArrowUpRight
                aria-hidden="true"
                className="size-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
              />
            </a>
          </AnimateIn>
        ) : null}

        {children ? (
          <AnimateIn preset="fadeUp" inView delay={0.32}>
            {children}
          </AnimateIn>
        ) : null}
      </div>
    </section>
  );
}
