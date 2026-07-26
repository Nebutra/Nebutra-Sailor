import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Providers } from "@/components/providers";
import { routing } from "@/i18n/routing";
import { websiteJsonLd } from "@/lib/json-ld";
import { BASE_URL } from "@/lib/seo/alternates";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: "Tseka Luk — AI-Native Builder",
    template: "%s — Tseka Luk",
  },
  description:
    "I design and build AI-powered products from zero to one. Shipping fast and iterating in public.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "Tseka Luk — AI-Native Builder",
    description: "I design and build AI-powered products from zero to one.",
    url: BASE_URL,
    siteName: "TsekaLuk.dev",
    type: "website",
    images: [
      {
        url: `${BASE_URL}/og?title=Tseka+Luk&subtitle=AI-Native+Builder`,
        width: 1200,
        height: 630,
        alt: "Tseka Luk — AI-Native Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    creator: "@tseka_luk",
  },
  other: {
    "color-scheme": "light dark",
  },
  alternates: {
    // Deliberately no `canonical` and no `languages` here. Next merges metadata
    // shallowly per top-level key, so any page that does not set `alternates`
    // would inherit the layout's verbatim — and a layout cannot know the
    // request path. The old value pointed every such page at the ORIGIN ROOT,
    // which under next-intl's "always" localePrefix is itself a redirect URL,
    // alongside a hand-written cluster whose bare `zh` is not a route locale
    // (zh-Hans / zh-Hant) and cannot be resolved by the router.
    //
    // Each page now declares its own via `seoFor` in src/lib/seo/alternates.ts.
    types: {
      "application/rss+xml": `${BASE_URL}/rss.xml`,
    },
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  );
}
