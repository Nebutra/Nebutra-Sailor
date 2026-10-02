import { getBrandEmail } from "@nebutra/brand/metadata-helpers";
import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};
  const t = await getTranslations({ locale: lang, namespace: "legalPages.dpa" });
  return buildPageMetadata({
    title: t("meta.title"),
    description: t("meta.description"),
    path: "/dpa",
    locale: lang as Locale,
  });
}

export default async function DpaPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  const t = await getTranslations({ locale: lang, namespace: "legalPages.dpa" });

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("lastUpdated")}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">{t("availability.heading")}</h2>
        <p className="leading-relaxed text-muted-foreground">{t("availability.p1")}</p>
        <p className="leading-relaxed text-muted-foreground">{t("availability.p2")}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">{t("howToRequest.heading")}</h2>
        <p className="leading-relaxed text-muted-foreground">
          {t.rich("howToRequest.emailIntro", {
            email: () => (
              <a
                href={`mailto:${getBrandEmail("legal")}?subject=DPA%20Request`}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {getBrandEmail("legal")}
              </a>
            ),
          })}
        </p>
        <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
          <li>{t("howToRequest.items.0")}</li>
          <li>{t("howToRequest.items.1")}</li>
          <li>{t("howToRequest.items.2")}</li>
        </ul>
        <p className="leading-relaxed text-muted-foreground">{t("howToRequest.response")}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-foreground">{t("related.heading")}</h2>
        <ul className="ml-6 list-disc space-y-2 text-muted-foreground">
          <li>
            <Link
              href="/security"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("related.security")}
            </Link>
          </li>
          <li>
            <Link
              href="/privacy"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("related.privacy")}
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("related.terms")}
            </Link>
          </li>
          <li>
            <Link
              href="/cookies"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("related.cookies")}
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
