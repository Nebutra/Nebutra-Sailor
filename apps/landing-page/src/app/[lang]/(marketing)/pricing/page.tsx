import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import { Star, User } from "lucide-react";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { FooterMinimal, Navbar, PricingSection } from "@/components/landing";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";

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

  return (
    <main id="main-content" className="min-h-screen bg-white dark:bg-black">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Header */}
        <AnimateIn preset="emerge" inView>
          <div className="text-center">
            <h1
              className="text-4xl font-bold tracking-tight sm:text-5xl"
              style={{
                background: "var(--brand-gradient)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {pricing("title")}
            </h1>
            <p className="mt-4 text-lg text-[var(--neutral-11)]">{pricing("description")}</p>

            {/* Social Proof & Framework Switcher */}
            <div className="mt-8 flex flex-col items-center justify-center gap-6">
              {/* Avatar Group */}
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-background bg-muted dark:bg-zinc-800"
                    >
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center sm:items-start gap-1">
                  <div className="flex text-amber-500">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p
                    className="text-sm text-muted-foreground font-medium"
                    dangerouslySetInnerHTML={{
                      __html: pricing.markup("socialProofText", {
                        highlight: (chunks) =>
                          `<span class='text-foreground font-semibold'>${chunks}</span>`,
                      }),
                    }}
                  />
                </div>
              </div>

              {/* Framework Switcher */}
              <div className="mt-2 flex flex-col items-center gap-3">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {pricing("frameworkText")}
                </p>
                <div className="inline-flex items-center rounded-full border border-border/40 bg-muted/20 p-1 backdrop-blur-sm shadow-sm">
                  <span className="flex items-center gap-2 rounded-full bg-background/90 dark:bg-zinc-800 px-4 py-1.5 text-sm font-medium text-foreground shadow-sm">
                    {/* SVG inline for Next.js to avoid external loads */}
                    <svg viewBox="0 0 180 180" width="16" height="16" className="dark:invert">
                      <path d="M90 0C40.294 0 0 40.294 0 90s40.294 90 90 90 90-40.294 90-90S139.706 0 90 0zm43.376 137.986l-39.77-62.115v56.772h-12.793V49.076h11.967l40.16 62.72v-62.72h12.792v88.91zM90 166.402c-42.197 0-76.402-34.205-76.402-76.402S47.803 13.598 90 13.598 166.402 47.803 166.402 90s-34.205 76.402-76.402 76.402z" />
                    </svg>
                    {pricing("frameworkNext")}
                  </span>
                  <span className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground grayscale cursor-not-allowed">
                    {pricing("frameworkNuxt")}
                  </span>
                  <span className="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed">
                    {pricing("frameworkTanStack")}
                  </span>
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
                    {faq(`${qKey}.q` as any)}
                    <span className="ml-4 shrink-0 text-[var(--neutral-11)] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--neutral-11)]">
                    {faq(`${qKey}.a` as any)}
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

      <FooterMinimal />
    </main>
  );
}
