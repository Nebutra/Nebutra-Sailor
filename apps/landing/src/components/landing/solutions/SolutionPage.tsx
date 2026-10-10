import { ArrowRight, ArrowUpRight } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Badge, MagicCard } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { FeatureHero } from "@/components/landing/features/FeatureHero";
import {
  DEFAULT_GROUP_TOKENS,
  type FeatureGroupTokens,
} from "@/components/landing/features/feature-group-tokens";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createAppSignUpUrl } from "@/lib/app-url";
import { getSolutionGroup, type Solution } from "@/lib/constants/solutions-data";
import { getSolutionContentSource } from "@/lib/solutions/content-source";

/** Reads a dynamic dotted path / raw value out of `solutionsCatalog` — the slug is data, not a literal key. */
interface CatalogTranslator {
  (key: string): string;
  raw: (key: string) => unknown;
}

interface SolutionUseCase {
  title: string;
  body: string;
}

interface SolutionFaq {
  q: string;
  a: string;
}

export interface SolutionPageProps {
  solution: Solution;
  locale: Locale;
}

/**
 * Manus-mapped solution template. Renders by `solution.type`:
 *   - "content"  → dual-intent (try the product + read best practices)
 *   - "offering" → single strong CTA into contact/sales
 * Server component; the best-practice strip is fetched through the
 * source-decoupled `SolutionContentSource` and hides itself when empty.
 */
export async function SolutionPage({ solution, locale }: SolutionPageProps) {
  const group = getSolutionGroup(solution.groupId);
  const isOffering = solution.type === "offering";

  const tokens: FeatureGroupTokens = {
    auroraColors: group?.auroraColors ?? DEFAULT_GROUP_TOKENS.auroraColors,
    ambient: "subtle",
    icon: solution.icon,
    docsPath: "",
  };

  const relatedPosts = solution.contentCategory
    ? await getSolutionContentSource().getRelatedPosts(solution.contentCategory, locale, 3)
    : [];

  const t = (await getTranslations({
    locale,
    namespace: "solutionsCatalog",
  })) as unknown as CatalogTranslator;

  const heroEyebrow = t(`solutions.${solution.slug}.hero.eyebrow`);
  const heroTitle = t(`solutions.${solution.slug}.hero.title`);
  const heroTitleAccent = t(`solutions.${solution.slug}.hero.titleAccent`);
  const heroSummary = t(`solutions.${solution.slug}.hero.summary`);
  const useCases = Object.values(
    t.raw(`solutions.${solution.slug}.useCases`) as Record<string, SolutionUseCase>,
  );
  const faq = Object.values(t.raw(`solutions.${solution.slug}.faq`) as Record<string, SolutionFaq>);

  const ctaHref = isOffering ? "/contact" : createAppSignUpUrl();
  const ctaLabel = isOffering ? t("page.ctaOffering") : t("page.ctaContent");

  return (
    <>
      <FeatureHero
        align="left"
        tokens={tokens}
        backHref="/solutions"
        backLabel={t("page.back")}
        eyebrow={heroEyebrow}
        titlePrefix={heroTitle}
        titleSuffix={heroTitleAccent}
        summary={heroSummary}
        {...(isOffering ? {} : { primaryCtaHref: ctaHref, primaryCtaLabel: ctaLabel })}
      >
        {isOffering ? (
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[color:hsl(var(--foreground))] px-6 py-3 text-sm font-semibold text-[color:hsl(var(--background))] transition-[background-color] hover:bg-[color:hsl(var(--foreground)/0.9)]"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </FeatureHero>

      {/* Use cases — 痛点 → 方案 */}
      <section className="mx-auto max-w-wide px-4 py-16 md:px-6 md:py-24">
        <AnimateIn preset="fadeUp" inView>
          <h2 className="mb-10 text-2xl font-bold text-neutral-12 md:text-3xl">
            {t("page.useCasesHeading")}
          </h2>
        </AnimateIn>
        <AnimateInGroup stagger="normal" className="grid gap-6 md:grid-cols-3">
          {useCases.map((uc) => (
            <AnimateIn key={uc.title} preset="fadeUp">
              <MagicCard className="h-full rounded-[var(--radius-2xl)] border border-border/60 p-6">
                <h3 className="mb-2 text-lg font-semibold text-neutral-12">{uc.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-11">{uc.body}</p>
              </MagicCard>
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </section>

      {/* Capabilities */}
      {solution.capabilityAnchors?.length ? (
        <section className="mx-auto max-w-wide px-4 pb-16 md:px-6 md:pb-24">
          <AnimateIn preset="fadeUp" inView>
            <h2 className="mb-6 text-xl font-bold text-neutral-12 md:text-2xl">
              {t("page.capabilities")}
            </h2>
            <div className="flex flex-wrap gap-3">
              {solution.capabilityAnchors.map((anchor) => (
                <Link
                  key={anchor}
                  href={`/features#${anchor}`}
                  className="group inline-flex items-center gap-1.5"
                >
                  <Badge
                    variant="outline"
                    className="gap-1.5 px-3 py-1.5 text-sm transition-colors group-hover:border-foreground/40"
                  >
                    {anchor.replace(/^capability-/, "")}
                    <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
                  </Badge>
                </Link>
              ))}
            </div>
          </AnimateIn>
        </section>
      ) : null}

      {/* Best-practice strip — hidden while content is being authored */}
      {relatedPosts.length > 0 ? (
        <section className="mx-auto max-w-wide px-4 pb-16 md:px-6 md:pb-24">
          <AnimateIn preset="fadeUp" inView>
            <h2 className="mb-8 text-2xl font-bold text-neutral-12 md:text-3xl">
              {t("page.bestPractices")}
            </h2>
          </AnimateIn>
          <AnimateInGroup stagger="normal" className="grid gap-6 md:grid-cols-3">
            {relatedPosts.map((post) => (
              <AnimateIn key={post.slug} preset="fadeUp">
                <Link href={post.href as Parameters<typeof Link>[0]["href"]}>
                  <MagicCard className="h-full rounded-[var(--radius-2xl)] border border-border/60 p-6">
                    <h3 className="mb-2 text-lg font-semibold text-neutral-12">{post.title}</h3>
                    <p className="text-sm leading-relaxed text-neutral-11">{post.excerpt}</p>
                  </MagicCard>
                </Link>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        </section>
      ) : null}

      {/* FAQ */}
      {faq.length > 0 ? (
        <section className="mx-auto max-w-4xl px-4 pb-20 md:px-6 md:pb-28">
          <AnimateIn preset="fadeUp" inView>
            <h2 className="mb-8 text-2xl font-bold text-neutral-12 md:text-3xl">
              {t("page.faqHeading")}
            </h2>
            <dl className="flex flex-col divide-y divide-border/60">
              {faq.map((item) => (
                <div key={item.q} className="py-5">
                  <dt className="mb-2 text-base font-semibold text-neutral-12">{item.q}</dt>
                  <dd className="text-sm leading-relaxed text-neutral-11">{item.a}</dd>
                </div>
              ))}
            </dl>
          </AnimateIn>
        </section>
      ) : null}
    </>
  );
}
