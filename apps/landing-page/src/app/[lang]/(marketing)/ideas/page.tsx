import { AnimatedGradientText } from "@nebutra/ui/primitives";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";

import type { Locale } from "@/i18n/routing";

export async function generateMetadata(props: { params: Promise<{ lang: string }> }) {
  const { lang } = await props.params;
  setRequestLocale(lang as Locale);

  const t = await getTranslations({ locale: lang as Locale, namespace: "nav" });
  return { title: `${t("ideas")} - Nebutra` };
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
        <div className="absolute inset-0 z-[-1] bg-[radial-gradient(circle_at_center,rgba(var(--primary-rgb),0.05)_0,transparent_50%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_0,transparent_50%)] blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none opacity-50 [-webkit-mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />

        <AnimatedGradientText className="mb-8 scale-110">
          <span className="flex items-center gap-2 font-mono tracking-widest uppercase text-xs">
            {t("badge")}
          </span>
        </AnimatedGradientText>

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 bg-gradient-to-br from-foreground to-foreground/40 bg-clip-text text-transparent drop-shadow-sm">
          {tNav("ideas")}
        </h1>

        <p className="text-muted-foreground/80 max-w-xl mx-auto text-lg md:text-xl mb-12 leading-relaxed font-medium">
          {t("description.ideas")}
        </p>

        <Link
          href="/"
          className="group relative inline-flex h-12 w-fit items-center justify-center overflow-hidden rounded-xl bg-primary px-8 text-sm font-bold text-primary-foreground shadow-[0_0_40px_-10px_rgba(0,0,0,0.4)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)] active:scale-95"
        >
          <span className="relative z-10 flex items-center gap-2">{t("returnBtn")}</span>
          <div className="absolute inset-0 z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
        </Link>
      </main>
      <FooterMinimal />
    </>
  );
}
