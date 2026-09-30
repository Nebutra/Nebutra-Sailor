import { brand } from "@nebutra/brand/metadata";
import {
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
} from "@nebutra/brand/metadata-helpers";
import { CjkFontFace } from "@nebutra/fonts/next/cjk";
import { toHtmlLang, toTextDir } from "@nebutra/i18n/locales";
import { Toaster } from "@nebutra/ui/primitives";
import type { Metadata, Viewport } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { ConsentGatedTelemetry } from "@/components/consent-gated-telemetry";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IcpFooter } from "@/components/icp-footer";
import { PresetPreview } from "@/components/preset-preview";
import { type Locale, routing } from "@/i18n/routing";
import { PRESET_PREVIEW } from "@/lib/preset-preview-flag";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getPublicNavigationItems } from "@/lib/seo/site-routes";
import { buildSiteNavigationSchema } from "@/lib/seo/structured-data";
import { SITE_ID } from "@/site.config";
import { SITE_SEO, siteMetadata } from "@/site-meta";
import { SITE_BRAND } from "@/site-theme";
import { fontVariables } from "../fonts";
import { Providers } from "../providers";

interface LangLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

// Organization JSON-LD: base from metadata-helpers + company-specific fields spread-merged.
// The legal name is the brand's; the registered address is Nebutra's own fact,
// so only the Nebutra site states it (the template would publish it as its own).
const orgBase = buildOrganizationJsonLd();
const websiteBase = buildWebSiteJsonLd();
const softwareBase = buildSoftwareApplicationJsonLd();

const jsonLd = [
  {
    ...orgBase,
    // Company-specific fields not in the brand object:
    legalName: brand.nameFull,
    logo: `${orgBase.url}/icon.png`,
    ...(SITE_ID === "nebutra"
      ? {
          foundingDate: "2024",
          address: {
            "@type": "PostalAddress",
            addressLocality: "无锡市",
            addressRegion: "江苏省",
            addressCountry: "CN",
          },
        }
      : {}),
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
    description: SITE_SEO.description,
  },
  {
    ...softwareBase,
    ...SITE_SEO.software,
    description: SITE_SEO.softwareDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  },
  buildSiteNavigationSchema(getPublicNavigationItems()),
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
  const { title, description } = await siteMetadata(lang);

  return buildPageMetadata({
    title,
    description,
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
  //
  // solutionsCatalog (hero/useCases/FAQ for the solution detail pages) is
  // deliberately NOT listed here — it is read server-side only. The client-only
  // mega-menu / mobile drawer read the small `solutionsNav` / `resourcesCatalog`
  // namespaces instead (group + item label/tagline only).
  const CLIENT_NAMESPACES = [
    "siteShell",
    "siteMap",
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
    // Navbar mega-menu / mobile drawer (template chrome) — client-only, small
    "solutionsNav",
    "resourcesCatalog",
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
      className={`${fontVariables} min-h-dvh antialiased`}
      // The site's Brand Package, set on the server so the first paint already
      // has it (site-theme.ts; the template has none).
      data-brand={SITE_BRAND}
      suppressHydrationWarning
    >
      <body className="antialiased">
        {PRESET_PREVIEW ? (
          // The visitor's Sailor Studio look, from their cookie, in the first paint.
          <link rel="stylesheet" href="/preset-preview.css" precedence="high" />
        ) : null}
        <CjkFontFace />

        <a
          href="#main-content"
          className="sr-only fixed left-3 top-3 z-[var(--layer-skip-link)] rounded-[var(--radius-md)] bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only"
        >
          Skip to content
        </a>

        {/*
         * A plain <script>, not next/script: `beforeInteractive` serialises its
         * children into a `self.__next_s.push(...)` call, so the HTML carried no
         * application/ld+json element and parsers that do not run JavaScript
         * found no Organization/WebSite/SoftwareApplication data.
         */}
        <script
          id="nebutra-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: toSafeJsonLd(jsonLd) }}
        />

        <Providers>
          <ErrorBoundary>
            <NextIntlClientProvider locale={locale} messages={clientMessages}>
              {/*
               * No <Suspense> around the page. React 19 streams any completed
               * boundary larger than ~12.8 KB of document out of line: the
               * fallback stays in place and the page arrives in a
               * `<div hidden>` that an inline script swaps in. A reader that
               * runs no JavaScript — GPTBot, ClaudeBot, PerplexityBot, most
               * HTML-to-text extractors — saw "Loading…" on every page. Page
               * content belongs in the shell; only request-time islands get a
               * boundary of their own. Guarded by scripts/verify-landing-ssr.mjs.
               */}
              {children}
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
              {PRESET_PREVIEW ? <PresetPreview /> : null}
            </NextIntlClientProvider>
          </ErrorBoundary>
        </Providers>
        <ConsentGatedTelemetry />
      </body>
    </html>
  );
}
