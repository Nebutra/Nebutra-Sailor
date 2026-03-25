import { Check } from "@nebutra/icons";
import { AnimateIn, AnimateInGroup } from "@nebutra/ui/components";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";

const TIERS = [
  {
    key: "standard",
    ctaHref: "/sign-up",
    highlighted: false,
    featureKeys: ["f1", "f2", "f3", "f4"] as const,
  },
  {
    key: "enterprise",
    ctaHref: "/contact",
    highlighted: true,
    featureKeys: ["f1", "f2", "f3", "f4", "f5"] as const,
  },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  const t = await getTranslations({ locale: lang, namespace: "metadata" });
  const tp = await getTranslations({ locale: lang, namespace: "microLanding.pricing" });
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
  "use cache";
  cacheLife("hours");

  const { lang } = await params;
  setRequestLocale(lang as Locale);

  // @ts-expect-error — microLanding namespace not in generated type map
  const pricing = await getTranslations({ locale: lang, namespace: "microLanding.pricing" });
  // @ts-expect-error — microLanding namespace not in generated type map
  const faq = await getTranslations({ locale: lang, namespace: "microLanding.faq" });

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
          </div>
        </AnimateIn>

        {/* Pricing cards — 2 tier grid */}
        <AnimateInGroup
          stagger="normal"
          className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 max-w-4xl mx-auto"
        >
          {TIERS.map((tier) => (
            <AnimateIn key={tier.key} preset="fadeUp">
              <div
                className={[
                  "relative flex flex-col rounded-2xl border p-8 shadow-sm transition-shadow hover:shadow-md",
                  tier.highlighted
                    ? "border-transparent bg-[var(--neutral-1)]"
                    : "border-[var(--neutral-7)] bg-[var(--neutral-1)]",
                ].join(" ")}
              >
                {/* Gradient border for highlighted tier */}
                {tier.highlighted && (
                  <div
                    className="absolute inset-0 -z-10 rounded-2xl p-[1px]"
                    style={{ background: "var(--brand-gradient)" }}
                    aria-hidden
                  />
                )}

                {/* Badge */}
                <span
                  className={[
                    "mb-6 inline-block self-start rounded-full px-3 py-1 text-xs font-semibold",
                    tier.highlighted
                      ? "text-white"
                      : "border border-[var(--neutral-7)] text-[var(--neutral-11)]",
                  ].join(" ")}
                  style={tier.highlighted ? { background: "var(--brand-gradient)" } : {}}
                >
                  {pricing(`${tier.key}.badge`)}
                </span>

                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-[var(--neutral-12)]">
                    {pricing(`${tier.key}.price`)}
                  </span>
                  <span className="text-sm text-[var(--neutral-11)]">
                    / {pricing(`${tier.key}.period`)}
                  </span>
                </div>

                <p className="mt-3 text-sm text-[var(--neutral-11)]">
                  {pricing(`${tier.key}.desc`)}
                </p>

                <a
                  href={tier.ctaHref}
                  className={[
                    "mt-8 block rounded-lg px-6 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--blue-9)] focus:ring-offset-2",
                    tier.highlighted
                      ? "text-white"
                      : "border border-[var(--neutral-7)] text-[var(--neutral-12)] hover:bg-[var(--neutral-2)]",
                  ].join(" ")}
                  style={tier.highlighted ? { background: "var(--brand-gradient)" } : {}}
                >
                  {pricing(`${tier.key}.cta`)}
                </a>

                <ul className="mt-8 space-y-3">
                  {tier.featureKeys.map((fKey) => (
                    <li
                      key={fKey}
                      className="flex items-start gap-3 text-sm text-[var(--neutral-11)]"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--blue-9)]" aria-hidden />
                      {pricing(`${tier.key}.${fKey}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>
          ))}
        </AnimateInGroup>

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
                    {faq(`${qKey}.q`)}
                    <span className="ml-4 shrink-0 text-[var(--neutral-11)] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--neutral-11)]">
                    {faq(`${qKey}.a`)}
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
