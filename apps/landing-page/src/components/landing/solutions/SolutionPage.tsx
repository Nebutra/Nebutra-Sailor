import { ArrowRight, ArrowUpRight } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Badge, MagicCard } from "@nebutra/ui/primitives";
import { FeatureHero } from "@/components/landing/features/FeatureHero";
import {
  DEFAULT_GROUP_TOKENS,
  type FeatureGroupTokens,
} from "@/components/landing/features/feature-group-tokens";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { createAppSignUpUrl } from "@/lib/app-url";
import { getSolutionGroup, pick, type Solution } from "@/lib/constants/solutions-data";
import { getSolutionContentSource } from "@/lib/solutions/content-source";

const COPY = {
  back: { en: "All solutions", zh: "全部解决方案" },
  useCases: { en: "How it helps", zh: "它如何帮你" },
  capabilities: { en: "Powered by", zh: "由这些能力驱动" },
  bestPractices: { en: "Best practices", zh: "最佳实践" },
  faq: { en: "FAQ", zh: "常见问题" },
  ctaContent: { en: "Get Sailed", zh: "开始使用" },
  ctaOffering: { en: "Book a scoping call", zh: "预约范围沟通" },
  exploreCapability: { en: "Explore", zh: "查看" },
} as const;

function copy(key: keyof typeof COPY, locale: string): string {
  return locale === "zh" ? COPY[key].zh : COPY[key].en;
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

  const ctaHref = isOffering ? "/contact" : createAppSignUpUrl();
  const ctaLabel = isOffering ? copy("ctaOffering", locale) : copy("ctaContent", locale);

  return (
    <>
      <FeatureHero
        align="left"
        tokens={tokens}
        backHref="/solutions"
        backLabel={copy("back", locale)}
        eyebrow={pick(solution.hero.eyebrow, locale)}
        titlePrefix={pick(solution.hero.title, locale)}
        titleSuffix={pick(solution.hero.titleAccent, locale)}
        summary={pick(solution.hero.summary, locale)}
        {...(isOffering ? {} : { primaryCtaHref: ctaHref, primaryCtaLabel: ctaLabel })}
      >
        {isOffering ? (
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[color:hsl(var(--foreground))] px-6 py-3 text-sm font-semibold text-[color:hsl(var(--background))] transition-opacity hover:opacity-90"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </FeatureHero>

      {/* Use cases — 痛点 → 方案 */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 md:px-6 md:py-24">
        <AnimateIn preset="fadeUp" inView>
          <h2 className="mb-10 text-2xl font-bold text-neutral-12 md:text-3xl">
            {copy("useCases", locale)}
          </h2>
        </AnimateIn>
        <AnimateInGroup stagger="normal" className="grid gap-6 md:grid-cols-3">
          {solution.useCases.map((uc) => (
            <AnimateIn key={uc.title.en} preset="fadeUp">
              <MagicCard className="h-full rounded-[var(--radius-2xl)] border border-border/60 p-6">
                <h3 className="mb-2 text-lg font-semibold text-neutral-12">
                  {pick(uc.title, locale)}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-11">{pick(uc.body, locale)}</p>
              </MagicCard>
            </AnimateIn>
          ))}
        </AnimateInGroup>
      </section>

      {/* Capabilities */}
      {solution.capabilityAnchors?.length ? (
        <section className="mx-auto max-w-[1400px] px-4 pb-16 md:px-6 md:pb-24">
          <AnimateIn preset="fadeUp" inView>
            <h2 className="mb-6 text-xl font-bold text-neutral-12 md:text-2xl">
              {copy("capabilities", locale)}
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
        <section className="mx-auto max-w-[1400px] px-4 pb-16 md:px-6 md:pb-24">
          <AnimateIn preset="fadeUp" inView>
            <h2 className="mb-8 text-2xl font-bold text-neutral-12 md:text-3xl">
              {copy("bestPractices", locale)}
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
      {solution.faq.length > 0 ? (
        <section className="mx-auto max-w-4xl px-4 pb-20 md:px-6 md:pb-28">
          <AnimateIn preset="fadeUp" inView>
            <h2 className="mb-8 text-2xl font-bold text-neutral-12 md:text-3xl">
              {copy("faq", locale)}
            </h2>
            <dl className="flex flex-col divide-y divide-border/60">
              {solution.faq.map((item) => (
                <div key={item.q.en} className="py-5">
                  <dt className="mb-2 text-base font-semibold text-neutral-12">
                    {pick(item.q, locale)}
                  </dt>
                  <dd className="text-sm leading-relaxed text-neutral-11">
                    {pick(item.a, locale)}
                  </dd>
                </div>
              ))}
            </dl>
          </AnimateIn>
        </section>
      ) : null}
    </>
  );
}
