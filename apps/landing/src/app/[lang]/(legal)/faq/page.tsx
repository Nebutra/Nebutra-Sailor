import { getBrandEmail } from "@nebutra/brand/metadata-helpers";
import { Button } from "@nebutra/ui/primitives";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StructuredData } from "@/components/seo/structured-data";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSiteUrl } from "@/lib/seo/site-routes";
import { buildFaqPageSchema } from "@/lib/seo/structured-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "legalPages" });
  return buildPageMetadata({
    title: t("faq.title"),
    description: t("faq.description"),
    path: "/faq",
    locale: lang as Locale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export default async function FAQPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale = lang as Locale;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legalPages" });

  const faqStructure = [
    { cat: 0 as const, questions: [0, 1, 2] as const },
    { cat: 1 as const, questions: [0, 1, 2] as const },
    { cat: 2 as const, questions: [0, 1, 2] as const },
    { cat: 3 as const, questions: [0, 1, 2] as const },
    { cat: 4 as const, questions: [0, 1] as const },
  ];

  const faqEntries = faqStructure.flatMap(({ cat, questions }) =>
    questions.map((qIdx) => ({
      question: t(`faq.categories.${cat}.questions.${qIdx}.q` as Parameters<typeof t>[0]),
      answer: t(`faq.categories.${cat}.questions.${qIdx}.a` as Parameters<typeof t>[0]),
    })),
  );

  return (
    <div className="space-y-12">
      <StructuredData data={buildFaqPageSchema(faqEntries)} id="faq-jsonld" />
      {/* Header */}
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{t("faq.heading")}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t("faq.subheading")}</p>
      </section>

      {/* FAQ Categories */}
      {faqStructure.map(({ cat, questions }) => (
        <section key={cat}>
          <h2 className="text-2xl font-bold text-foreground mb-6">
            {t(`faq.categories.${cat}.name`)}
          </h2>
          <div className="space-y-4">
            {questions.map((qIdx) => (
              <details key={qIdx} className="group rounded-[var(--radius-lg)] border border-border">
                <summary className="flex cursor-pointer items-center justify-between p-4 font-medium text-foreground">
                  {t(`faq.categories.${cat}.questions.${qIdx}.q` as Parameters<typeof t>[0])}
                  <span className="ml-4 shrink-0 transition group-open:rotate-180">
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </summary>
                <div className="border-t border-border p-4">
                  <p className="text-muted-foreground">
                    {t(`faq.categories.${cat}.questions.${qIdx}.a` as Parameters<typeof t>[0])}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}

      {/* Contact CTA */}
      <section className="rounded-[var(--radius-2xl)] bg-muted p-8 text-center">
        <h2 className="text-xl font-bold text-foreground">{t("faq.ctaHeading")}</h2>
        <p className="mt-2 text-muted-foreground">{t("faq.ctaDescription")}</p>
        <div className="mt-6 flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/contact">{t("faq.ctaButton")}</Link>
          </Button>
          <a
            href={`mailto:${getBrandEmail("support")}`}
            className="rounded-[var(--radius-lg)] border border-border px-6 py-3 font-semibold text-muted-foreground transition hover:bg-muted"
          >
            {t("faq.ctaEmail")}
          </a>
        </div>
      </section>
    </div>
  );
}
