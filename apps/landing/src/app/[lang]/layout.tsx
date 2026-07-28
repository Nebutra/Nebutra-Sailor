import {
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
} from "@nebutra/brand/metadata-helpers";
import { toHtmlLang, toTextDir } from "@nebutra/i18n/locales";
import { Toaster } from "@nebutra/ui/primitives";
import type { Metadata, Viewport } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import Script from "next/script";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { ConsentGatedTelemetry } from "@/components/consent-gated-telemetry";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IcpFooter } from "@/components/icp-footer";
import RouteSkeleton from "@/components/ui/route-skeleton";
import { type Locale, routing } from "@/i18n/routing";
import { seoContent } from "@/lib/landing-content";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  canonicalUrlForLocale,
  getSitelinkCandidateRoutes,
  getSiteUrl,
} from "@/lib/seo/site-routes";
import { buildSiteNavigationSchema } from "@/lib/seo/structured-data";
import { fontVariables } from "../fonts";
import { Providers } from "../providers";

interface LangLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

// Organization JSON-LD: base from metadata-helpers + company-specific fields spread-merged.
// legalName and contact emails are intentionally kept manual (not in brand object).
const orgBase = buildOrganizationJsonLd();
const websiteBase = buildWebSiteJsonLd();
const softwareBase = buildSoftwareApplicationJsonLd();

const jsonLd = [
  {
    ...orgBase,
    // Company-specific fields not in the brand object:
    legalName: "无锡云毓智能科技有限公司",
    logo: `${orgBase.url}/icon.png`,
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
        email: `support@${new URL(orgBase.url).hostname}`,
        availableLanguage: ["Chinese", "English"],
      },
      {
        "@type": "ContactPoint",
        contactType: "sales",
        email: `sales@${new URL(orgBase.url).hostname}`,
        availableLanguage: ["Chinese", "English"],
      },
    ],
  },
  {
    ...websiteBase,
    // Use the rich seoContent description for the website JSON-LD
    description: seoContent.description,
  },
  {
    ...softwareBase,
    description: "The Startup Agent OS — ship global SaaS in days, not months",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  },
  buildSiteNavigationSchema(
    getSitelinkCandidateRoutes().map((route) => ({
      name: route.sitelinkCandidate.label,
      url: canonicalUrlForLocale(getSiteUrl(), routing.defaultLocale, route.path),
    })),
  ),
];

function toSafeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

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

  return buildPageMetadata({
    title: t("title"),
    description: t("description"),
    path: "/",
    locale: lang as Locale,
  });
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ lang: locale }));
}

/**
 * Cached message loader — locale is the cache discriminator so each locale
 * gets its own cache entry. MUST NOT call setRequestLocale / getTranslations
 * or touch the ALS — those must stay in the layout body outside this function.
 */
async function getCachedMessages(locale: Locale) {
  "use cache";
  cacheLife("days");
  cacheTag("i18n-messages");
  cacheTag(`i18n-messages:${locale}`);
  return getMessages({ locale });
}

export default async function LangLayout({ children, params }: LangLayoutProps) {
  const { lang } = await params;

  if (!hasLocale(routing.locales, lang)) {
    notFound();
  }

  const locale = lang as Locale;
  setRequestLocale(locale);
  const messages = await getCachedMessages(locale);

  // Only ship the namespaces that are actually consumed by client components
  // ("use client") to the browser — server-only namespaces (metadata, hero,
  // featuresPage, comingSoon, roadmapMeta, blogMeta, getLicenseMeta,
  // changelogMeta, licensing, notFound, ui, logoStrip, icpFooter) are stripped
  // to keep the JS bundle lean (~979 keys → client-relevant subset).
  const CLIENT_NAMESPACES = [
    "nav",
    "licenseWizard",
    "legalPages",
    "monorepoTree",
    "microLanding",
    "landing",
    "designSystem",
    "cta",
    "footer",
    "blogShowcase",
    "useCases",
    "stats",
    "features",
    "compliance",
    // Market × language picker (Navbar chrome) — client-only
    "MarketLocalePicker",
  ] as const;

  type Messages = typeof messages;
  const clientMessages = Object.fromEntries(
    CLIENT_NAMESPACES.filter((ns) => ns in messages).map((ns) => [
      ns,
      messages[ns as keyof Messages],
    ]),
  ) as Partial<Messages>;

  return (
    <html
      lang={toHtmlLang(locale)}
      dir={toTextDir(locale)}
      className={`${fontVariables} min-h-screen antialiased`}
      suppressHydrationWarning
    >
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only fixed left-3 top-3 z-[100] rounded-[var(--radius-md)] bg-[color:hsl(var(--primary))] px-3 py-2 text-sm font-medium text-white focus:not-sr-only"
        >
          Skip to content
        </a>

        <Script id="nebutra-jsonld" type="application/ld+json" strategy="beforeInteractive">
          {toSafeJsonLd(jsonLd)}
        </Script>

        <Providers>
          <ErrorBoundary>
            <NextIntlClientProvider locale={locale} messages={clientMessages}>
              {/*
               * Suspense boundary: the shell (IcpFooter, Toaster) is outside so
               * it renders immediately from the cached layout. Children stream
               * in via RouteSkeleton → reduces the visible stall on locale
               * switches to near-zero.
               */}
              <Suspense fallback={<RouteSkeleton />}>{children}</Suspense>
              {process.env.NEXT_PUBLIC_ICP_NUMBER ? (
                <IcpFooter
                  locale={locale}
                  icpNumber={process.env.NEXT_PUBLIC_ICP_NUMBER}
                  publicSecurityRecord={process.env.NEXT_PUBLIC_PUBLIC_SECURITY_RECORD}
                />
              ) : null}
              {/* Global toast outlet — landing surfaces (e.g. changelog) can call `toast.*` */}
              <Toaster />
              <CookieConsentBanner />
            </NextIntlClientProvider>
          </ErrorBoundary>
        </Providers>
        <ConsentGatedTelemetry />
      </body>
    </html>
  );
}
