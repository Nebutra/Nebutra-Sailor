import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Star, User } from "lucide-react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar, PricingSection } from "@/components/landing";
import { PricingComparisonTable } from "@/components/landing/pricing-comparison-table";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";

const SOCIAL_AVATARS = [
  { id: "avatar-alpha" },
  { id: "avatar-beta" },
  { id: "avatar-gamma" },
  { id: "avatar-delta" },
  { id: "avatar-epsilon" },
] as const;

const RATING_STARS = [
  { id: "star-1" },
  { id: "star-2" },
  { id: "star-3" },
  { id: "star-4" },
  { id: "star-5" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const t = await getTranslations({ locale: lang as Locale, namespace: "metadata" });
  const tp = await getTranslations({ locale: lang as Locale, namespace: "microLanding.pricing" });
  return {
    title: `${tp("title")} — ${t("title")}`,
    description: tp("description"),
    alternates: { canonical: `/${lang}/pricing` },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export default async function PricingPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  const pricing = await getTranslations({
    locale: lang as Locale,
    namespace: "microLanding.pricing",
  });

  const faq = await getTranslations({ locale: lang as Locale, namespace: "microLanding.faq" });
  type FaqTranslationKey = Parameters<typeof faq>[0];

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-zinc-950">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimateIn preset="emerge" inView>
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              {pricing("title")}
            </h1>
            <p className="mt-4 text-lg text-[var(--neutral-11)]">{pricing("description")}</p>

            {/* Social Proof */}
            <div className="mt-8 flex flex-col items-center justify-center gap-6">
              {/* Avatar Group */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex -space-x-3">
                  {SOCIAL_AVATARS.map((avatar) => (
                    <div
                      key={avatar.id}
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted dark:bg-zinc-800"
                    >
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center sm:items-start gap-1">
                  <div className="flex text-amber-500">
                    {RATING_STARS.map((star) => (
                      <Star key={star.id} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {pricing.rich("socialProofText", {
                      highlight: (chunks) => (
                        <span className="font-semibold text-foreground">{chunks}</span>
                      ),
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </AnimateIn>

        {/* Pricing cards — 3 tier grid */}
        <div className="mt-16">
          <Suspense fallback={<div className="h-96" aria-hidden />}>
            <PricingSection hideHeader />
          </Suspense>
        </div>

        {/* Comparison Table — license tier breakdown */}
        <PricingComparisonTable />

        {/* FAQ section */}
        <div className="mt-24">
          <AnimateIn preset="emerge" inView>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-[var(--neutral-12)]">{faq("title")}</h2>
              <p className="mt-3 text-[var(--neutral-11)]">{faq("description")}</p>
            </div>
          </AnimateIn>

          <AnimateInGroup
            stagger="normal"
            className="mx-auto mt-12 max-w-3xl divide-y divide-[var(--neutral-7)]"
          >
            {(["q1", "q2", "q3", "q4"] as const).map((qKey) => (
              <AnimateIn key={qKey} preset="fadeUp">
                <details className="group py-6">
                  <summary className="flex cursor-pointer items-center justify-between text-left font-medium text-[var(--neutral-12)]">
                    {faq(`${qKey}.q` as FaqTranslationKey)}
                    <span className="ml-4 shrink-0 text-[var(--neutral-11)] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--neutral-11)]">
                    {faq(`${qKey}.a` as FaqTranslationKey)}
                  </p>
                </details>
              </AnimateIn>
            ))}
          </AnimateInGroup>
        </div>

        {/* Contact nudge */}
        <AnimateIn preset="fade" inView>
          <p className="mt-16 text-center text-sm text-[var(--neutral-11)]">
            <Link
              href="/contact"
              className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
            >
              {faq("description")}
            </Link>
          </p>
        </AnimateIn>
      </section>

      <FooterMinimal showFinalCta />
    </main>
  );
}
