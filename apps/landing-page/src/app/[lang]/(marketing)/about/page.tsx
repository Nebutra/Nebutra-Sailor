import { LogomarkSVG } from "@nebutra/brand";
import {
  ArrowRight,
  Buildings as Building,
  CheckCircle,
  Code as Code2,
  Globe,
  Shield,
  Lightning as Zap,
} from "@nebutra/icons";
import { AnimatedGradientText, Button, Card } from "@nebutra/ui/primitives";
import { getTranslations } from "next-intl/server";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Link } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  // @ts-expect-error - The locale is dynamically router-validated
  const t = await getTranslations({ locale: lang, namespace: "legalPages.about" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AboutPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  // @ts-expect-error - The locale is dynamically router-validated
  const t = await getTranslations({ locale: lang, namespace: "legalPages.about" });

  const valuesIcons = [Code2, Zap, Globe, Shield, CheckCircle, Building];

  return (
    <main id="main-content" className="flex flex-col min-h-screen bg-background">
      <Navbar />
      {/* 1. Header Section */}
      <section className="relative pt-32 md:pt-40 pb-20 overflow-hidden flex flex-col items-center text-center">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-1/2 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 blur-[120px] pointer-events-none opacity-20 z-0">
          <div
            className="aspect-[2/1] rounded-full"
            style={{ background: "var(--brand-gradient)" }}
          />
        </div>

        <div className="container relative z-10 mx-auto px-4 max-w-4xl">
          <div className="flex justify-center mb-8">
            <LogomarkSVG className="h-12 w-12 text-foreground drop-shadow-sm" />
          </div>
          <div className="flex justify-center mb-6">
            <AnimatedGradientText className="px-5 py-2">
              <span className="text-sm font-medium tracking-tight bg-clip-text">
                {t("title").split("—")[0].trim()}
              </span>
            </AnimatedGradientText>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-balance mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            {t("heading")}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground text-balance">
            {t("subheading")}
          </p>
        </div>
      </section>

      {/* 2. Mission Section */}
      <section className="py-20 md:py-28 bg-muted/30 border-y border-border/50 relative overflow-hidden">
        <div className="container relative z-10 mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-5xl font-black mb-12 tracking-tight text-center">
            {t("missionTitle")}
          </h2>
          <div className="space-y-6 md:space-y-8 text-[1.1rem] md:text-[1.2rem] text-muted-foreground/90 leading-[1.8] max-w-4xl mx-auto md:text-justify text-left">
            <p>{t("missionP1")}</p>
            <p>{t("missionP2")}</p>
            <p>{t("missionP3")}</p>
            <p className="font-medium text-foreground">{t("missionP4")}</p>
          </div>
        </div>
      </section>

      {/* 3. Core Values Grid */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
              {t("valuesTitle")}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const Icon = valuesIcons[i] || CheckCircle;

              // Dynamically split "中文 (English)" format to create visual hierarchy and prevent bad wrapping
              const titleRaw = t(`values.${i}.title`);
              const parts = titleRaw.split(" (");
              const zhText = parts[0];
              const enText = parts.length > 1 ? parts[1].replace(")", "") : "";

              return (
                <Card
                  key={i}
                  className="relative p-8 border-border/40 bg-background/40 backdrop-blur-xl rounded-[2rem] transition-all duration-500 overflow-hidden group hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/10 hover:bg-background/80 hover:border-primary/40"
                >
                  {/* Internal ambient sweep gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-out" />

                  <div className="relative z-10">
                    <div className="bg-primary/5 p-4 rounded-2xl w-fit mb-6 ring-1 ring-primary/20 group-hover:bg-primary/10 group-hover:ring-primary/40 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg group-hover:shadow-primary/20 origin-left">
                      <Icon className="h-6 w-6 text-primary/80 group-hover:text-primary transition-colors" />
                    </div>

                    <div className="flex flex-col mb-4">
                      <h3 className="text-xl md:text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors duration-300">
                        {zhText}
                      </h3>
                      {enText && (
                        <span className="mt-[0.35rem] text-[11px] font-mono text-primary/60 tracking-widest uppercase">
                          {enText}
                        </span>
                      )}
                    </div>

                    <p className="text-[0.95rem] text-muted-foreground leading-[1.7] font-medium">
                      {t(`values.${i}.description`)}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. CTA */}
      <section className="py-24 bg-muted/20 border-t border-border/50">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6">
            {t("ctaHeading")}
          </h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance">
            {t("ctaDescription")}
          </p>
          <div className="flex justify-center">
            <Link href="/contact">
              <Button
                size="lg"
                className="h-14 px-8 text-lg font-bold rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
              >
                {t("ctaButton")} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <FooterMinimal />
    </main>
  );
}
