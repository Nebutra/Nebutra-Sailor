import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import Script from "next/script";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { type Locale, routing } from "@/i18n/routing";
import { seoContent } from "@/lib/landing-content";
import { Providers } from "../providers";

interface LangLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

const ogLocaleMap: Record<string, string> = {
  en: "en_US",
  zh: "zh_CN",
  ja: "ja_JP",
  ko: "ko_KR",
  es: "es_ES",
  fr: "fr_FR",
  de: "de_DE",
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://nebutra.com/#organization",
    name: "Nebutra",
    alternateName: "云毓智能",
    legalName: "无锡云毓智能科技有限公司",
    url: "https://nebutra.com",
    logo: "https://nebutra.com/icon.png",
    foundingDate: "2024",
    address: {
      "@type": "PostalAddress",
      addressLocality: "无锡市",
      addressRegion: "江苏省",
      addressCountry: "CN",
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "support@nebutra.com",
        availableLanguage: ["Chinese", "English"],
      },
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: "sales@nebutra.com",
        availableLanguage: ["Chinese", "English"],
      },
    ],
    sameAs: [
      "https://github.com/Nebutra/Nebutra-Sailor",
      "https://x.com/nebutra",
      "https://linkedin.com/company/nebutra",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://nebutra.com/#website",
    name: "Nebutra",
    url: "https://nebutra.com",
    description: seoContent.description,
    publisher: { "@id": "https://nebutra.com/#organization" },
    inLanguage: ["en", "zh"],
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Nebutra Sailor",
    applicationCategory: "DeveloperApplication",
    url: "https://github.com/Nebutra/Nebutra-Sailor",
    description: "Production-ready Next.js monorepo template for AI SaaS products",
    author: { "@id": "https://nebutra.com/#organization" },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  },
];

function toSafeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** Map next-intl locale codes → hreflang BCP-47 values for <link rel="alternate"> */
const hreflangMap: Record<string, string> = {
  en: "en",
  zh: "zh-Hans",
  ja: "ja",
  ko: "ko",
  es: "es",
  fr: "fr",
  de: "de",
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nebutra.com";
const ENABLE_VERCEL_TELEMETRY = process.env.NODE_ENV === "production" && process.env.VERCEL === "1";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(routing.locales, lang)) return {};

  setRequestLocale(lang as Locale);
  const t = await getTranslations({ locale: lang, namespace: "metadata" });

  // Build hreflang map: each locale → its canonical URL prefix
  // Default locale (en) uses no path prefix per `localePrefix: "as-needed"`
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    languages[hreflangMap[locale] ?? locale] = `${BASE_URL}${prefix}`;
  }
  languages["x-default"] = BASE_URL;

  const canonicalPrefix = lang === routing.defaultLocale ? "" : `/${lang}`;

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${BASE_URL}${canonicalPrefix}`,
      languages,
    },
    openGraph: {
      locale: ogLocaleMap[lang] ?? "en_US",
      title: t("title"),
      description: t("description"),
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

export default async function LangLayout({ children, params }: LangLayoutProps) {
  const { lang } = await params;

  if (!hasLocale(routing.locales, lang)) {
    notFound();
  }

  const locale = lang as Locale;
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed left-3 top-3 z-[100] rounded-[var(--radius-md)] bg-[color:var(--blue-9)] px-3 py-2 text-sm font-medium text-white focus:not-sr-only"
      >
        Skip to content
      </a>

      <Script id="nebutra-jsonld" type="application/ld+json" strategy="beforeInteractive">
        {toSafeJsonLd(jsonLd)}
      </Script>

      <Providers>
        <ErrorBoundary>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </ErrorBoundary>
      </Providers>
      {ENABLE_VERCEL_TELEMETRY && (
        <>
          <SpeedInsights />
          <Analytics />
        </>
      )}
    </>
  );
}
