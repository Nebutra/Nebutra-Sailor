import { getMarketingHomePath } from "@nebutra/brand/metadata-helpers";
import { DEFAULT_ROUTE_LOCALE, toRouteLocale } from "@nebutra/i18n/locales";
import { AnimatedGradientText, Button } from "@nebutra/ui/primitives";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";

import type { Locale } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang as Locale, namespace: "nav" });
  return buildPageMetadata({
    title: `${t("ideas")} - Nebutra`,
    description: t("ideas"),
    path: "/ideas",
    locale: lang as Locale,
  });
}

export default async function IdeasPage(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang as Locale, namespace: "comingSoon" });
  const tNav = await getTranslations({ locale: lang as Locale, namespace: "nav" });

  return (
    <>
      <Navbar />
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-24 px-6 md:px-12 text-center z-10 selection:bg-primary/20">
        {/* hsl(var(--primary)/…) rather than rgba(var(--primary-rgb),…): there is
            no --primary-rgb token, so the light-mode gradient resolved to an
            invalid colour and the whole background-image was discarded. Only
            the dark variant painted, because that one used a literal. */}
        <div className="absolute inset-0 z-[-1] bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.05)_0,transparent_50%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0,transparent_50%)] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none opacity-50 [-webkit-mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />

        <AnimatedGradientText className="mb-8 scale-110">
          <span className="flex items-center gap-2 font-mono tracking-widest uppercase text-xs">
            {t("badge")}
          </span>
        </AnimatedGradientText>

        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold mb-6 bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent"
          style={{ letterSpacing: "var(--tracking-display)", lineHeight: "var(--leading-display)" }}
        >
          {tNav("ideas")}
        </h1>

        <p className="text-muted-foreground/80 max-w-xl mx-auto text-lg md:text-xl mb-12 leading-relaxed font-medium">
          {t("description.ideas")}
        </p>

        <Button asChild variant="ink" size="lg">
          <a
            href={getMarketingHomePath({
              locale: toRouteLocale(lang),
              defaultLocale: DEFAULT_ROUTE_LOCALE,
            })}
          >
            {t("returnBtn")}
          </a>
        </Button>
      </main>
      <FooterMinimal />
    </>
  );
}
