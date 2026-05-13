import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";

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
  return {
    title: "Data Processing Addendum (DPA) — Nebutra",
    description:
      "Nebutra's Data Processing Addendum is available on request for customers handling personal data.",
    alternates: { canonical: `/${lang}/dpa` },
  };
}

export default async function DpaPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-bold tracking-tight text-[var(--neutral-12)]">
          Data Processing Addendum (DPA)
        </h1>
        <p className="mt-3 text-sm text-[var(--neutral-10)]">Last updated: 2026-05-13</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--neutral-12)]">Availability</h2>
        <p className="leading-relaxed text-[var(--neutral-11)]">
          Nebutra Intelligence (&quot;Nebutra&quot;) provides a Data Processing Addendum to
          customers whose use of our services involves processing personal data of EU, UK, Swiss, or
          California residents, or any other jurisdiction with comparable data protection laws.
        </p>
        <p className="leading-relaxed text-[var(--neutral-11)]">
          Our DPA aligns with Article 28 GDPR, includes standard contractual clauses (EU 2021/914)
          where required, and reflects sub-processor obligations.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--neutral-12)]">How to request</h2>
        <p className="leading-relaxed text-[var(--neutral-11)]">
          Email{" "}
          <a
            href="mailto:legal@nebutra.com?subject=DPA%20Request"
            className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
          >
            legal@nebutra.com
          </a>{" "}
          with:
        </p>
        <ul className="ml-6 list-disc space-y-2 text-[var(--neutral-11)]">
          <li>Your legal entity name and signing authority</li>
          <li>Whether you would like to use our standard DPA or send your own draft</li>
          <li>Any required regional addenda (UK IDTA, Swiss FADP, etc.)</li>
        </ul>
        <p className="leading-relaxed text-[var(--neutral-11)]">
          We respond within one business day.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-[var(--neutral-12)]">Related</h2>
        <ul className="ml-6 list-disc space-y-2 text-[var(--neutral-11)]">
          <li>
            <Link
              href="/security"
              className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
            >
              Security overview
            </Link>
          </li>
          <li>
            <Link
              href="/privacy"
              className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
            >
              Terms of Service
            </Link>
          </li>
          <li>
            <Link
              href="/cookies"
              className="font-medium text-[var(--blue-9)] underline-offset-4 hover:underline"
            >
              Cookie Policy
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
